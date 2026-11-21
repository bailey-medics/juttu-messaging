"""The GitHub runs watcher, with GitHub and the inlet stood in for."""

import json
import urllib.request
from collections.abc import Callable

import pytest

from app.watcher.github_runs import (
    DEFAULT_INLET_URL,
    Run,
    Watcher,
    WatchFailed,
    line_for,
    main,
    runs_from,
)

TOKEN = "made-up-github-token"
SECRET = "7.made-up-inlet-secret"
ENVIRON = {"JUTTU_GITHUB_TOKEN": TOKEN, "JUTTU_INLET_SECRET": SECRET}


def raw_run(
    run_id: int,
    status: str = "in_progress",
    conclusion: str | None = None,
    pull_request: int | None = None,
) -> dict[str, object]:
    return {
        "id": run_id,
        "name": "CI",
        "head_branch": "feature/accounts-deploy-cards",
        "status": status,
        "conclusion": conclusion,
        "pull_requests": []
        if pull_request is None
        else [{"number": pull_request}],
    }


class StandIn:
    """Answers GitHub with each round's runs in turn, and records what is sent."""

    def __init__(self, rounds: list[list[dict[str, object]]]) -> None:
        self.rounds = rounds
        self.requests: list[urllib.request.Request] = []
        self.inlet_fails = False
        self.github_fails = False

    def __call__(self, request: urllib.request.Request) -> bytes:
        self.requests.append(request)

        if request.full_url.startswith("https://api.github.com"):
            if self.github_fails:
                raise WatchFailed("GitHub answered 503.")
            runs = self.rounds.pop(0) if self.rounds else []
            return json.dumps({"workflow_runs": runs}).encode()

        if self.inlet_fails:
            raise WatchFailed("The inlet answered 502.")
        return b"{}"

    def sent(self) -> list[dict[str, object]]:
        events: list[dict[str, object]] = []
        for request in self.requests:
            if request.full_url == DEFAULT_INLET_URL and request.data:
                assert isinstance(request.data, bytes)
                events.append(json.loads(request.data))

        return events


def run_watcher(
    stand_in: StandIn,
    rounds: int,
    environ: dict[str, str] = ENVIRON,
    between: Callable[[int], None] | None = None,
) -> list[str]:
    logged: list[str] = []
    done = 0

    def sleep(_seconds: float) -> None:
        nonlocal done
        done += 1
        if between is not None:
            between(done)

    main(
        environ, opener=stand_in, sleep=sleep, log=logged.append, rounds=rounds
    )

    return logged


class TestWatching:
    def test_the_runs_there_at_start_are_never_sent(self) -> None:
        stand_in = StandIn([[raw_run(1, "completed", "failure")]])

        run_watcher(stand_in, rounds=1)

        assert stand_in.sent() == []

    def test_a_new_run_and_each_change_to_it_are_sent(self) -> None:
        stand_in = StandIn(
            [
                [],
                [raw_run(5)],
                [raw_run(5)],
                [raw_run(5, "completed", "success")],
            ]
        )

        run_watcher(stand_in, rounds=4)

        assert stand_in.sent() == [
            {
                "key": "5",
                "title": "CI: feature/accounts-deploy-cards",
                "line": "Running",
                "needs_somebody": False,
            },
            {
                "key": "5",
                "title": "CI: feature/accounts-deploy-cards",
                "line": "Passed",
                "needs_somebody": True,
            },
        ]

    def test_a_pull_request_s_run_is_titled_by_its_number(self) -> None:
        stand_in = StandIn([[], [raw_run(6, pull_request=42)]])

        run_watcher(stand_in, rounds=2)

        assert stand_in.sent()[0]["title"] == "CI: #42"

    def test_each_event_carries_the_secret_and_asks_as_localhost(self) -> None:
        stand_in = StandIn([[], [raw_run(7)]])

        run_watcher(stand_in, rounds=2)

        (inlet,) = [
            r for r in stand_in.requests if r.full_url == DEFAULT_INLET_URL
        ]
        assert inlet.get_header("Authorization") == f"Bearer {SECRET}"
        assert inlet.get_header("Host") == "localhost"
        github = stand_in.requests[0]
        assert github.get_header("Authorization") == f"Bearer {TOKEN}"

    def test_a_github_failure_is_logged_and_the_watcher_carries_on(
        self,
    ) -> None:
        stand_in = StandIn([[], [raw_run(8)]])
        stand_in.github_fails = True

        def recover(done: int) -> None:
            stand_in.github_fails = False

        logged = run_watcher(stand_in, rounds=3, between=recover)

        assert "Skipped this round: GitHub answered 503." in logged
        assert [e["key"] for e in stand_in.sent()] == ["8"]

    def test_a_run_the_inlet_did_not_take_is_tried_again(self) -> None:
        stand_in = StandIn([[], [raw_run(9)], [raw_run(9)]])

        def fail_then_recover(done: int) -> None:
            stand_in.inlet_fails = done == 1

        logged = run_watcher(stand_in, rounds=3, between=fail_then_recover)

        assert "Run 9 not sent: The inlet answered 502." in logged
        assert [e["key"] for e in stand_in.sent()] == ["9", "9"]

    @pytest.mark.parametrize(
        "environ",
        [{}, {"JUTTU_GITHUB_TOKEN": TOKEN}, {"JUTTU_INLET_SECRET": SECRET}],
    )
    def test_without_a_token_or_a_secret_nothing_is_asked_or_sent(
        self, environ: dict[str, str]
    ) -> None:
        stand_in = StandIn([[raw_run(1)]])

        logged = run_watcher(stand_in, rounds=3, environ=environ)

        assert stand_in.requests == []
        assert logged == [
            "No JUTTU_GITHUB_TOKEN or no inlet secret, so no GitHub runs are watched."
        ]

    def test_the_token_and_secret_never_reach_the_log(self) -> None:
        stand_in = StandIn(
            [[], [raw_run(10)], [raw_run(10, "completed", "failure")]]
        )
        stand_in.inlet_fails = True

        logged = run_watcher(stand_in, rounds=3)

        assert logged
        assert not any(TOKEN in line or SECRET in line for line in logged)


class TestReadingRuns:
    @pytest.mark.parametrize(
        ("status", "conclusion", "expected"),
        [
            ("queued", None, ("Running", False)),
            ("in_progress", None, ("Running", False)),
            ("completed", "success", ("Passed", True)),
            ("completed", "failure", ("Failed", True)),
            ("completed", "cancelled", ("Cancelled", True)),
            ("completed", "timed_out", ("Failed: timed out", True)),
            ("completed", "neutral", ("Neutral", True)),
        ],
    )
    def test_each_status_reads_as_a_line(
        self, status: str, conclusion: str | None, expected: tuple[str, bool]
    ) -> None:
        assert line_for(status, conclusion) == expected

    def test_a_run_github_did_not_describe_fully_is_left_out(self) -> None:
        runs = runs_from(
            {
                "workflow_runs": [
                    raw_run(1),
                    {"id": "two"},
                    "nonsense",
                    raw_run(3),
                ]
            }
        )

        assert [run.id for run in runs] == [1, 3]

    def test_an_answer_with_no_runs_is_a_failure(self) -> None:
        with pytest.raises(WatchFailed):
            runs_from({"message": "Bad credentials"})

    def test_an_unchanged_run_is_not_sent_again(self) -> None:
        watcher = Watcher()
        running = Run(1, "CI: main", "Running", False)
        watcher.changes([])

        assert watcher.changes([running]) == [running]
        assert watcher.changes([running]) == []


def test_only_a_web_address_is_opened() -> None:
    from app.watcher.github_runs import open_url

    with pytest.raises(WatchFailed, match="Only a web address"):
        open_url(urllib.request.Request("file:///etc/passwd"))
