# Juttu skeleton plan

Juttu has a settled plan, the
[vision and first version plan](2026-11-21-juttu-vision-and-first-version-plan.md),
but no code. This plan builds the empty shell every later phase stands on,
ported from Quill Medical: the repository's checks, a backend and database,
a frontend that installs on a phone as a progressive web app (PWA), the dev
stack, the pipeline, and a long-running copy on the dev box. It was split
from the vision plan on 21 November 2026 so that building can start while
the later phases' questions wait until they matter.

The outcome is a Juttu that does nothing yet but does it properly: it
starts, passes its checks on every pull request, and installs on a phone
from the dev box over the team's private network. The decisions behind it,
the licence, what is ported from Quill Medical, Docker on the dev box before
any external server, are recorded in the vision plan and not repeated here.

## Open questions

- [x] **Does Gunicorn run Uvicorn workers, or Django's own synchronous workers?** - Django's own synchronous workers: plain Gunicorn, serving Django over WSGI, as Turva does. It is the simpler of the two. Live delivery in the vision plan's Phase 18 then needs its own answer when it comes, because each long-lived connection would hold a whole worker. Answered in `/t-g`, 21 November 2026.

- [x] **Is the move to Django built on top of the stack, or are Phases 2 and 3 rebuilt in place?** - Rebuilt in place. Phase 8 rewrites #5, the backend skeleton, and Phase 9 rewrites #6, the database, as Django. Phase 10 carries the change up through #7 to #11, which use the backend's Dockerfile, test container and migration script. The FastAPI version is no longer in any branch afterwards; Phases 2 and 3 below record that it was built. Answered in `/t-g`, 21 November 2026.

- [x] **Which library does Juttu write its API with on Django?** - Django REST framework (DRF), as Turva uses, so Turva's sign-in code ports most directly in the vision plan's Phase 8. Its serializers are looser than Pydantic models, so the house rule to type everything leans on `djangorestframework-stubs` under mypy. Answered in `/t-g`, 21 November 2026.

- [x] **What may the next `/t-f` run do when rebuilding #5 and #6 causes rebase conflicts in #7 to #11?** - Resolve them itself, unattended. The run may rewrite #5 to #11, fold each Django change into the branch it belongs to, resolve each conflict to the Django version, run the gates on each rewritten branch, push through `gh stack` and rewrite the affected pull request descriptions. The Decisions section sets out how. Answered in `/t-g`, 21 November 2026.

- [x] **Which database do the backend tests run against?** - Postgres, never SQLite, so a test exercises the database Juttu runs on: its types, its constraints and its transactions behave differently from SQLite's. Quill Medical's unit tests use SQLite in memory; Juttu's do not. Phase 9 gives the unit-test container a throwaway Postgres, and a test fails if the database engine is ever anything else. Answered in `/t-g`, 21 November 2026.

## Before running /f

- [x] Switch on HTTPS certificates for the dev box in the private network's admin console, if they are not on already. A phone will only install a PWA, and only accept push notifications, from an HTTPS address. Needed for Phase 7 only. Already on: checked 21 November 2026, when the network reported certificate domains for the box.

- [x] Land this plan's Django changes, and `cspell.config.json`, before running `/t-f` again: add conftest, CONN, djangorestframework, Pydantic, runserver and tmpfs to the word list, then run `/t-crpd`, which stacks them as their own branch on #11. Phase 8's first step folds everything uncommitted into #5, so these must not be left in the working tree, and the spelling check fails on the plan until the words are in. Done 21 November 2026, as its own branch on #11.

## Phase 1: Repository basics

- [x] Add the AGPL-3.0 `LICENSE`, and write `AGENTS.md`: what Juttu is, its invariants, its commands and what needs approval. `CLAUDE.md` then only points to it.

- [x] Port the checks that need no code to run on: the spelling configuration, with "Juttu" and "Turva" in its word list, the Markdown and editor settings, the pre-commit configuration and the tracked git hook, with a `just` recipe that switches the hook on. Safe to be on `main` on its own: it adds rules and nothing that runs.

## Phase 2: Backend skeleton

- [x] Port a minimal FastAPI app from Quill Medical: configuration, structured logging, a health endpoint, its Dockerfile, and the lint and type-check settings. Nothing from Google Cloud comes across. Built as written with FastAPI; Phase 8 rebuilds this branch (#5) in Django, in place.

- [x] Port the unit-test container and its `just` recipe, so the tests run from any worktree without the dev stack. Tests for configuration and the health endpoint.

## Phase 3: Database

- [x] Add Postgres to Compose, published on host port 5533 (`JUTTU_POSTGRES_PORT`), the SQLAlchemy session set-up, and Alembic with an empty first migration. Port the `just` recipe that autogenerates a migration against a throwaway database and fails on an empty result. Built as written with SQLAlchemy and Alembic; Phase 9 rebuilds this branch (#6) with Django's ORM and migrations, in place.

## Phase 4: Frontend skeleton

- [x] Port a minimal React, Mantine and Vite app: the theme, the root layout, the router and one page that calls the health endpoint. Port the Vitest and Storybook set-up, with a test and a story for the page. The Vite dev server listens on 5273 (`JUTTU_FRONTEND_PORT`) and Storybook on 6106 (`JUTTU_STORYBOOK_PORT`).

## Phase 5: PWA shell

- [x] Port the web app manifest, the service worker and the install prompt, so the app installs on a phone and shows its own page when offline. Tests for the service worker's caching rules.

## Phase 6: Dev stack and pipeline

- [x] Port the development Compose file with the Caddy reverse proxy in front, and the `just` recipes that start, stop and rebuild the stack. Juttu's stack has ports of its own, so it runs beside Quill Medical's and Turva's: the backend on 8100 (`JUTTU_WEB_PORT`), Caddy on 8180 for HTTP and 8543 for HTTPS (`JUTTU_HTTP_PORT`, `JUTTU_HTTPS_PORT`), with Postgres, Vite and Storybook on the ports set in Phases 3 and 4. Each port can be changed through its variable in the gitignored root `.env`, as Turva's can, and the Compose project is named `juttu`, so its containers and volumes never share a name with another stack's. Port the worktree recipe, so a new worktree gets its environment files and virtual environment.

- [x] Add the pipeline: one workflow that runs the hooks, the backend and frontend tests and the builds on every pull request.

## Phase 7: Run on the dev box

- [x] Add a second Compose file for a long-running copy on the dev box, apart from the development stack, with its own Compose project name (`juttu-box`), its own database volume and its own port, 8290 (`JUTTU_BOX_PORT`), and a `just` recipe to deploy the current `main` to it. It is served over HTTPS on the team's private network and is not reachable from the public internet. No address or machine name goes into the repository: they live in a gitignored environment file.

- [x] Document how a team member installs the PWA on a phone from that address.

## Phase 8: Rebuild the backend skeleton in Django (#5)

This phase, and Phases 9 and 10, change branches already in the stack instead of adding new ones. The Decisions section sets out how `/t-f` runs them.

- [x] Rewrite `feature/foundations-backend-skeleton` (#5) so `backend/` is a Django project, ported from Turva, which already runs Django. `backend/manage.py`, with `backend/config/` holding `settings.py`, `urls.py` and `wsgi.py`, and the app's own code under `backend/app/`. Keep what the shell does today, so nothing above the backend notices the change:
  - **Settings read from the environment, as now.** Keep the `pydantic-settings` class in `app/config.py`, which validates `BACKEND_ENV` and `LOG_LEVEL`, and have `config/settings.py` read from it. Add `JUTTU_SECRET_KEY`, required in production, with a fixed development value otherwise, and `JUTTU_ALLOWED_HOSTS`, a comma-separated list, defaulting to `localhost,127.0.0.1` outside production and required in it. No database yet: `DATABASES` arrives in Phase 9.
  - **Structured logging, readable in development and JSON elsewhere**, with a request id on every line and in the `X-Request-ID` header, as Django middleware and the `LOGGING` setting. The 64-character limit on a caller's request id stays.
  - **`GET /api/health` answers `{"status": "ok"}`**, as a DRF view with `permission_classes = [AllowAny]`, public on purpose and saying so. DRF's default permission is `IsAuthenticated`, so any later view is closed unless it says otherwise. DRF's browsable API is off; responses are JSON only.
  - **Django's admin is not installed.** It would put a sign-in page at `/admin/` before Juttu has accounts. The vision plan's Phase 8 decides whether to add it.
  - **Gunicorn serves the `prod` target** (`gunicorn config.wsgi --workers 2 --bind 0.0.0.0:8000`), with plain synchronous workers. The `dev` target runs Django's `runserver`, which reloads on change.
  - **Tests move to `pytest-django`**, keeping what each test pins down today: the settings, the health check, the request id and the log format. None of Phase 8's tests touches a database; Phase 9 gives the tests their Postgres.
  - **Lint and type checks for Django.** `django-stubs` and `djangorestframework-stubs` under strict mypy, with every package the mypy hook installs pinned to `backend/poetry.lock`, as `s/tests/mypy-pins.bats` requires. Bandit and ruff as now. FastAPI, Uvicorn, Starlette and `httpx2` leave `backend/pyproject.toml`.
  - **Rewrite #5's description**, since nothing in it about FastAPI stays true.

## Phase 9: Rebuild the database with Django's ORM and migrations (#6)

- [x] Rewrite `feature/foundations-database` (#6) to use Django's ORM and migrations in place of SQLAlchemy and Alembic. `DATABASES` reads the same `DB_*` variables, through `django.db.backends.postgresql` and psycopg 3, and production still refuses to start without `DB_PASSWORD`. `ATOMIC_REQUESTS = True` gives each request one transaction that commits or rolls back, which `get_db` did. `CONN_HEALTH_CHECKS = True` stands in for `pool_pre_ping`. Alembic's empty first migration, `alembic/` and `alembic.ini` go, with SQLAlchemy's naming convention; Django names its own constraints. No table was ever deployed, so no data moves and nothing a person relies on is dropped. Postgres in `compose.dev.yml` stays as it is.

- [x] In the same branch, run the backend tests against Postgres, never SQLite. `compose.unit-tests.yml` gains a `db` service: the same pinned Postgres 18 image as the dev stack, its data in memory (`tmpfs`), so nothing survives a run, under each worktree's own Compose project, so two worktrees testing at once never share a database. The backend container waits for it to be healthy, and the two share an `internal` network, so the tests still reach nothing outside the run. `pytest-django` builds its test database there, and each test that touches the database runs in a transaction rolled back at the end. `backend/conftest.py` fails the whole run if `DATABASES["default"]["ENGINE"]` is anything but `django.db.backends.postgresql`, so a settings change cannot quietly fall back to SQLite. CI's backend job runs the same `bash s/test backend`, so it needs no change. Update the `s/test` bats tests if the command changes.

- [x] In the same branch, port `s/migrate` to Django, keeping its throwaway Postgres in `compose.migrate.yml`. `s/migrate new "<message>"` turns the message into a migration name (`add users` becomes `add_users`) and runs `manage.py makemigrations --name`. Django writes nothing and says "No changes detected" when the models already match, and the script fails then, as `just migrate` does today. `s/migrate check`, which `./s/test` and CI run, runs `migrate`, then `migrate <app> zero` for each of Juttu's own apps that has migrations, then `migrate` again, then `makemigrations --check --dry-run`. Update the bats tests for `s/migrate` and rewrite #6's description.

## Phase 10: Carry Django up the stack (#7 to #11)

- [x] Resolve each conflict the cascade rebase raises in #7 to #11 to the Django version, folding each fix into the branch it lands in. What each needs:
  - **#7 to #8 (frontend, PWA shell)** - only where `s/test` or `AGENTS.md` names FastAPI, pytest or Alembic.
  - **#9 (dev stack)** - the backend service runs `manage.py migrate` and then `manage.py runserver 0.0.0.0:8000`. Its health check calls the same `/api/health`. The development `JUTTU_SECRET_KEY` and `JUTTU_ALLOWED_HOSTS` come from the backend's defaults, so `.env.example` needs no new line.
  - **#10 (pipeline)** - the backend job's commands stay the same; only a renamed script or image target changes it.
  - **#11 (dev box copy)** - the backend runs `manage.py migrate` and then Gunicorn. `s/box` adds a random `JUTTU_SECRET_KEY` to `local/box.env` when the file lacks one, as it does the database password, and sets `JUTTU_ALLOWED_HOSTS` from `JUTTU_BOX_ADDRESS` with the port taken off, so no address goes into the repository. Update `docs/dev-box.md` and the `s/box` bats tests to match.
  - **`AGENTS.md`**, in whichever branch first names the backend's tools, says Django, DRF, Gunicorn and `just migrate` as they now work.

  Rewrite each pull request description whose text the change made untrue. Then run `bash s/lint`, `bash s/test` and `bash s/frontend` at the top of the stack, and `bash s/lint` and `bash s/test` on each rewritten branch, before pushing.

## Decisions

- **Django, Django REST framework and Gunicorn in place of FastAPI** - Mark asked for this on 21 November 2026, after Phases 1 to 7 were built with FastAPI. Django brings sessions, CSRF protection, its own migrations and, if wanted, an admin, which the vision plan's Phase 8 (accounts and sign-in) and Phase 11 (organisations and roles) would otherwise port from Quill Medical's FastAPI code. Turva already runs Django with DRF and Gunicorn, so the team knows them, and the sign-in work can port from Turva instead. This changes what the vision plan ports from Quill Medical for the backend; the frontend, the tooling and the PWA shell still come from Quill. Gunicorn's synchronous workers leave live delivery (vision plan Phase 18) to be answered when that phase comes.

- **How `/t-f` runs Phases 8 to 10: rewriting landed branches** - these phases change #5 to #11 instead of adding branches, which `/t-f` and `/t-crpd` otherwise forbid. Mark authorised it in `/t-g` on 21 November 2026, for these three phases only:

  1. **Move to the branch with `just -g stack-move`**, make the change, and fold it into the branch's one commit with `just -g stack-update`, never as a second commit. Reword the commit message where it names FastAPI, SQLAlchemy or Alembic.
  2. **Let the cascade rebase raise its conflicts, and resolve each one to the Django version**, as Phase 10 lists, then continue the rebase. A conflict that Phase 10 does not foresee, or one that needs a choice the plan does not make, stops the run.
  3. **Park `frontend/node_modules` in `local/` and clear `__pycache__/` before each rebase**, as "Found while building" explains.
  4. **Push with `just -g stack-submit`**, which pushes every rewritten branch. Never `git push` and never `--force` by hand.
  5. **Rewrite each affected pull request's description, keep each one ready, and never merge.**
  6. **Then check CI on every pull request**, as the next decision sets out.

- **How `/t-f` runs this plan: ready pull requests, and CI checked after every phase** - Mark asked on 21 November 2026 to "try something different for this plan". It overrides two defaults in `/t-f`, for this plan only:

  1. **Finish each phase with `/t-crpd`, not `/t-crpd draft`,** so its pull request is marked ready straight away. Mark asked for this, which is the exception `/t-f` allows to "never take a pull request out of draft".
  2. **Then check CI on every pull request in the stack**, with `gh pr checks` for each one. A check still running is left for the next phase's round.
  3. **If a check has failed, stop the plan and fix it before the next phase.** Read the failing job's log, reproduce it locally and fix the code, not the check. Then run the same check locally and the branch's tests, and confirm both pass.
  4. **Fold the fix into the branch it belongs to.** Move to that branch with `just -g stack-move`, fold the fix into its one commit with `just -g stack-update`, then `just -g stack-rebase` and `just -g stack-submit` so the branches above it follow. Rewrite that pull request's description if the fix changed what it says. This is the "when asked" case for changing a landed branch, and it is authorised for this run only.
  5. **Go back to the top of the stack and carry on** with the next phase.

  The usual two-attempt rule applies: if the same check is still red after two real attempts, stop the run and report it. CI exists only from Phase 6, which adds the pipeline, so Phases 1 to 5 have nothing to check. After Phase 7, wait for every check on every pull request to finish, and fix any that fail the same way before reporting the run done.

- **Split from the vision plan** - `/t-f` will not start while any box in a plan's open questions or jobs is unticked, and the vision plan's open items belong to phases far ahead. The skeleton has only one job, and it is needed only at its last phase.

- **Juttu has its own ports** - the dev box already runs Turva's stack on 80, 443, 5173, 5433 and 8000, and Quill Medical's uses 80, 5173, 5174 and 6006. Ports copied from Quill would clash on Juttu's first start, and an unattended run would stop there. Juttu's are each about a hundred above the usual ones (8100, 5273, 5533, 6106, 8180, 8543, 8290), so they are easy to recognise, and all were free on 21 November 2026.

- **Ported, not written fresh** - Quill Medical's tooling has already been through the problems a new project meets: worktrees sharing a virtual environment, hooks pointing at the wrong checkout, migrations that come out empty. Copying it saves relearning them.

## Found while building

- **Clear Python bytecode caches before landing a unit** - found 21 November 2026, landing Phase 2. `gh stack rebase` checks out each branch in turn, from the bottom of the stack. The bottom branch's `.gitignore` predates the Python rules, so `__pycache__/` folders left by a local test run showed as untracked there, and the rebase stopped part-way. Deleting them (`find backend -name __pycache__ -prune -exec rm -rf {} +`) before `/t-crpd` avoids it. Once the stack merges, every branch carries the rules and the trap goes.

- **Park `frontend/node_modules` in `local/` while landing** - found 21 November 2026, landing Phase 4, for the same reason as the bytecode caches. `frontend/.gitignore` exists only from Phase 4, so on lower branches `node_modules` shows as untracked during the rebase. `local/` is ignored on every branch, so moving it there for the rebase and back afterwards avoids it. The build output (`dist/`, `storybook-static/`) is deleted instead.

- **The offline page was checked in a real browser** - 21 November 2026, Phase 5. With the build served by `vite preview`, Chromium came under the worker's control, showed `offline.html` on a reload with the network cut, failed `/api/health` instead of answering it from a cache, and served an icon from the precache. The check used Playwright from outside the repository; the browser tests that would make it part of CI are not built yet.

- **The development database is published on this machine only** - Phase 3 binds Postgres to `127.0.0.1:5533`, not to every interface. Only psql and an editor on the dev box need it; the backend reaches it on the stack's own network. The long-running copy in Phase 7 publishes nothing but its web port.

- **Juttu's copy on the dev box has its own HTTPS port, 8290** - found 21 November 2026, building Phase 7. The private network already serves another app on port 443 of the dev box, so Juttu's copy is put behind the private network's HTTPS proxy on port 8290, the same number as its local port. Phones open `https://<the box's private network name>:8290`. Running that proxy command once is a person's job, written up in `docs/dev-box.md`.

- **CI's pre-commit cache must live outside the checkout** - found 21 November 2026, in the first CI run on the pipeline's pull request. With `PRE_COMMIT_HOME` inside the workspace, `s/lint`'s pass over untracked files met the cache's folders and stopped with "Unable to hash". The cache now sits in pre-commit's default home, `~/.cache/pre-commit`. The fix was folded into the pipeline's own commit.

- **The health check stays outside the per-request transaction** - found 21 November 2026, building Phase 9. `ATOMIC_REQUESTS` opens a database transaction for every view, the health check's included, so `GET /api/health` would have failed whenever Postgres was away, and its tests needed a database. `config/urls.py` wraps that one view in `transaction.non_atomic_requests`, so it still says only that the backend is up.

- **Phase 9 was built while resolving the rebase conflict on #6** - 21 November 2026. Rebuilding #5 as Django made the cascade rebase stop on #6, in the five files both branches change. Phase 9 rewrites that same branch, so the conflict was resolved straight to #6's Django version, with the rest of Phase 9 in the same pass, and #6's gates were run before the rebase continued. #6's commit message was then reworded on its own.

- **The cascade also stopped on #7 and #9**, both in places Phase 10 foresaw: `AGENTS.md`'s layout table, which Prettier realigns whenever a row changes width, `s/test`'s list of suites, and its bats tests. #8, #10 and #11 rebased cleanly; #11's changes were made afterwards and folded in.

- **A Django secret key and the allowed hosts for the box copy** - 21 November 2026, Phase 10. `s/box` adds a random `JUTTU_BOX_SECRET_KEY` to `local/box.env` when it lacks one, and passes `JUTTU_BOX_ALLOWED_HOSTS` on each call, worked out from `JUTTU_BOX_ADDRESS`, with `localhost` and `127.0.0.1` for the health check. A request to any other host gets HTTP 400. Until `JUTTU_BOX_ADDRESS` is set, phones are refused, and `docs/dev-box.md` says so.
