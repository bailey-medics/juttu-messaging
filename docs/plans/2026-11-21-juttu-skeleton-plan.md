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

## Before running /f

- [x] Switch on HTTPS certificates for the dev box in the private network's admin console, if they are not on already. A phone will only install a PWA, and only accept push notifications, from an HTTPS address. Needed for Phase 7 only. Already on: checked 21 November 2026, when the network reported certificate domains for the box.

## Phase 1: Repository basics

- [x] Add the AGPL-3.0 `LICENSE`, and write `AGENTS.md`: what Juttu is, its invariants, its commands and what needs approval. `CLAUDE.md` then only points to it.

- [x] Port the checks that need no code to run on: the spelling configuration, with "Juttu" and "Turva" in its word list, the Markdown and editor settings, the pre-commit configuration and the tracked git hook, with a `just` recipe that switches the hook on. Safe to be on `main` on its own: it adds rules and nothing that runs.

## Phase 2: Backend skeleton

- [x] Port a minimal FastAPI app from Quill Medical: configuration, structured logging, a health endpoint, its Dockerfile, and the lint and type-check settings. Nothing from Google Cloud comes across.

- [x] Port the unit-test container and its `just` recipe, so the tests run from any worktree without the dev stack. Tests for configuration and the health endpoint.

## Phase 3: Database

- [x] Add Postgres to Compose, published on host port 5533 (`JUTTU_POSTGRES_PORT`), the SQLAlchemy session set-up, and Alembic with an empty first migration. Port the `just` recipe that autogenerates a migration against a throwaway database and fails on an empty result.

## Phase 4: Frontend skeleton

- [x] Port a minimal React, Mantine and Vite app: the theme, the root layout, the router and one page that calls the health endpoint. Port the Vitest and Storybook set-up, with a test and a story for the page. The Vite dev server listens on 5273 (`JUTTU_FRONTEND_PORT`) and Storybook on 6106 (`JUTTU_STORYBOOK_PORT`).

## Phase 5: PWA shell

- [ ] Port the web app manifest, the service worker and the install prompt, so the app installs on a phone and shows its own page when offline. Tests for the service worker's caching rules.

## Phase 6: Dev stack and pipeline

- [ ] Port the development Compose file with the Caddy reverse proxy in front, and the `just` recipes that start, stop and rebuild the stack. Juttu's stack has ports of its own, so it runs beside Quill Medical's and Turva's: the backend on 8100 (`JUTTU_WEB_PORT`), Caddy on 8180 for HTTP and 8543 for HTTPS (`JUTTU_HTTP_PORT`, `JUTTU_HTTPS_PORT`), with Postgres, Vite and Storybook on the ports set in Phases 3 and 4. Each port can be changed through its variable in the gitignored root `.env`, as Turva's can, and the Compose project is named `juttu`, so its containers and volumes never share a name with another stack's. Port the worktree recipe, so a new worktree gets its environment files and virtual environment.

- [ ] Add the pipeline: one workflow that runs the hooks, the backend and frontend tests and the builds on every pull request.

## Phase 7: Run on the dev box

- [ ] Add a second Compose file for a long-running copy on the dev box, apart from the development stack, with its own Compose project name (`juttu-box`), its own database volume and its own port, 8290 (`JUTTU_BOX_PORT`), and a `just` recipe to deploy the current `main` to it. It is served over HTTPS on the team's private network and is not reachable from the public internet. No address or machine name goes into the repository: they live in a gitignored environment file.

- [ ] Document how a team member installs the PWA on a phone from that address.

## Decisions

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

- **The development database is published on this machine only** - Phase 3 binds Postgres to `127.0.0.1:5533`, not to every interface. Only psql and an editor on the dev box need it; the backend reaches it on the stack's own network. The long-running copy in Phase 7 publishes nothing but its web port.
