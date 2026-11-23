"""Watch the repository's GitHub Actions runs, and send each change as a card.

Run on the dev box as ``python -m app.watcher.github_runs``, beside the box
copy. About once a minute it asks GitHub for the latest runs, and sends
each run that is new or has changed to the box copy's inlet, as an
``outside`` event. It only ever makes outgoing connections, so nothing on
the box is exposed.

It is a sender like any other: it decides what each card says. Every
finished run sets ``needs_somebody``, so passed and failed runs both
notify. The runs already there when it starts are recorded as seen and not
sent, so a restart never sends old notifications again.

The token and the secret travel only in request headers, and never appear
in a log line. Nothing Django is imported: this needs only the standard
library.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

GITHUB_API = "https://api.github.com"
DEFAULT_REPOSITORY = "bailey-medics/juttu-messaging"
DEFAULT_INLET_URL = "http://backend:8000/api/inlet/events"
#: Django answers only the hosts it was told; the inlet is asked as this one.
INLET_HOST = "localhost"
POLL_SECONDS = 60
TIMEOUT_SECONDS = 15
RUNS_PER_PAGE = 30

#: What a finished run's conclusion reads as on its card.
CONCLUSIONS = {
    "success": "Passed",
    "failure": "Failed",
    "cancelled": "Cancelled",
    "timed_out": "Failed: timed out",
    "skipped": "Skipped",
    "action_required": "Waiting for approval",
}

#: Sends one request; stood in for by the tests.
Opener = Callable[[urllib.request.Request], bytes]
Log = Callable[[str], None]


class WatchFailed(Exception):
    """GitHub or the inlet did not answer as hoped, with what went wrong."""


@dataclass(frozen=True)
class Run:
    """One Actions run, as its card shows it."""

    id: int
    title: str
    line: str
    finished: bool

    def event(self) -> dict[str, object]:
        """The ``outside`` event that brings the run's card up to date."""
        return {
            "key": str(self.id),
            "title": self.title,
            "line": self.line,
            "needs_somebody": self.finished,
        }


def line_for(status: str, conclusion: str | None) -> tuple[str, bool]:
    """A run's line, and whether it has finished."""
    # Queued, in progress, waiting and the rest all read as running.
    if status != "completed":
        return "Running", False

    if conclusion is None:
        return "Finished", True

    return CONCLUSIONS.get(
        conclusion, conclusion.replace("_", " ").capitalize()
    ), True


def title_for(raw: Mapping[str, object]) -> str:
    """ "CI: #42" for a pull request's run, or "CI: main" for a branch's."""
    name = raw.get("name") or "Workflow"
    pull_requests = raw.get("pull_requests")

    if isinstance(pull_requests, list) and pull_requests:
        first = pull_requests[0]
        if isinstance(first, Mapping) and isinstance(first.get("number"), int):
            return f"{name}: #{first['number']}"

    return f"{name}: {raw.get('head_branch') or 'unknown branch'}"


def runs_from(payload: object) -> list[Run]:
    """The runs in GitHub's answer, leaving out any it did not describe fully."""
    if not isinstance(payload, Mapping):
        raise WatchFailed("GitHub's answer was not a JSON object.")

    found: list[Run] = []
    raw_runs = payload.get("workflow_runs")
    if not isinstance(raw_runs, list):
        raise WatchFailed("GitHub's answer had no list of runs.")

    for raw in raw_runs:
        if not isinstance(raw, Mapping):
            continue
        run_id = raw.get("id")
        status = raw.get("status")
        conclusion = raw.get("conclusion")
        if not isinstance(run_id, int) or not isinstance(status, str):
            continue
        if conclusion is not None and not isinstance(conclusion, str):
            continue
        line, finished = line_for(status, conclusion)
        found.append(Run(run_id, title_for(raw)[:200], line, finished))

    return found


class Watcher:
    """Remembers what each run's card last said, and finds what changed."""

    def __init__(self) -> None:
        self.sent: dict[int, Run] = {}
        self.started = False

    def changes(self, runs: Sequence[Run]) -> list[Run]:
        """The runs to send now: new, or changed since last sent.

        The first call records what is there and sends nothing, so a
        restart never repeats a notification.
        """
        changed = [run for run in runs if self.sent.get(run.id) != run]
        for run in runs:
            self.sent[run.id] = run

        if not self.started:
            self.started = True
            return []

        # Oldest first, so cards update in the order things happened.
        return sorted(changed, key=lambda run: run.id)


def open_url(request: urllib.request.Request) -> bytes:
    """Send *request*, and hand back the answer's body.

    Only a web address is opened: ``urlopen`` would also open a ``file:``
    one, which nothing here should ever ask for.
    """
    if not request.full_url.startswith(("https://", "http://")):
        raise WatchFailed("Only a web address can be asked.")

    try:
        # The address is checked above.
        with urllib.request.urlopen(
            request, timeout=TIMEOUT_SECONDS
        ) as answer:  # nosec B310  # noqa: S310
            body: bytes = answer.read()
    except urllib.error.HTTPError as error:
        raise WatchFailed(
            f"{request.full_url} answered {error.code}."
        ) from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise WatchFailed(f"Could not reach {request.full_url}.") from error

    return body


def fetch_runs(token: str, repository: str, opener: Opener) -> list[Run]:
    """The repository's latest runs, newest first, as GitHub lists them."""
    request = urllib.request.Request(
        f"{GITHUB_API}/repos/{repository}/actions/runs?per_page={RUNS_PER_PAGE}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "juttu-github-watcher",
        },
    )

    try:
        payload = json.loads(opener(request))
    except json.JSONDecodeError as error:
        raise WatchFailed("GitHub's answer was not JSON.") from error

    return runs_from(payload)


def send(run: Run, secret: str, inlet_url: str, opener: Opener) -> None:
    """Send *run*'s card event to the inlet."""
    request = urllib.request.Request(
        inlet_url,
        data=json.dumps(run.event()).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "Host": INLET_HOST,
        },
    )

    opener(request)


def watch_once(
    watcher: Watcher,
    *,
    token: str,
    secret: str,
    repository: str,
    inlet_url: str,
    opener: Opener,
    log: Log,
) -> None:
    """Ask GitHub once, and send whatever changed. Never raises."""
    try:
        runs = fetch_runs(token, repository, opener)
    except WatchFailed as error:
        log(f"Skipped this round: {error}")
        return

    for run in watcher.changes(runs):
        try:
            send(run, secret, inlet_url, opener)
        except WatchFailed as error:
            log(f"Run {run.id} not sent: {error}")
            # Forget it, so the next round tries again.
            watcher.sent.pop(run.id, None)
        else:
            log(f"Run {run.id}: {run.line}")


def main(
    environ: Mapping[str, str] = os.environ,
    opener: Opener = open_url,
    sleep: Callable[[float], None] = time.sleep,
    log: Log = lambda line: print(line, flush=True),
    rounds: int | None = None,
) -> None:
    """Watch until stopped. *rounds* stops it early, for the tests."""
    token = environ.get("JUTTU_GITHUB_TOKEN", "")
    secret = environ.get("JUTTU_INLET_SECRET", "")
    repository = environ.get("JUTTU_GITHUB_REPOSITORY", DEFAULT_REPOSITORY)
    inlet_url = environ.get("JUTTU_INLET_URL", DEFAULT_INLET_URL)
    watcher = Watcher()
    done = 0

    if not token or not secret:
        log(
            "No JUTTU_GITHUB_TOKEN or no inlet secret, so no GitHub runs are watched."
        )

    while rounds is None or done < rounds:
        if token and secret:
            watch_once(
                watcher,
                token=token,
                secret=secret,
                repository=repository,
                inlet_url=inlet_url,
                opener=opener,
                log=log,
            )
        done += 1
        sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
