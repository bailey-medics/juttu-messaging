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

- [ ] Switch on HTTPS certificates for the dev box in the private network's admin console, if they are not on already. A phone will only install a PWA, and only accept push notifications, from an HTTPS address. Needed for Phase 7 only.

## Phase 1: Repository basics

- [ ] Add the AGPL-3.0 `LICENSE`, and write `AGENTS.md`: what Juttu is, its invariants, its commands and what needs approval. `CLAUDE.md` then only points to it.

- [ ] Port the checks that need no code to run on: the spelling configuration, with "Juttu" and "Turva" in its word list, the Markdown and editor settings, the pre-commit configuration and the tracked git hook, with a `just` recipe that switches the hook on. Safe to be on `main` on its own: it adds rules and nothing that runs.

## Phase 2: Backend skeleton

- [ ] Port a minimal FastAPI app from Quill Medical: configuration, structured logging, a health endpoint, its Dockerfile, and the lint and type-check settings. Nothing from Google Cloud comes across.

- [ ] Port the unit-test container and its `just` recipe, so the tests run from any worktree without the dev stack. Tests for configuration and the health endpoint.

## Phase 3: Database

- [ ] Add Postgres to Compose, the SQLAlchemy session set-up, and Alembic with an empty first migration. Port the `just` recipe that autogenerates a migration against a throwaway database and fails on an empty result.

## Phase 4: Frontend skeleton

- [ ] Port a minimal React, Mantine and Vite app: the theme, the root layout, the router and one page that calls the health endpoint. Port the Vitest and Storybook set-up, with a test and a story for the page.

## Phase 5: PWA shell

- [ ] Port the web app manifest, the service worker and the install prompt, so the app installs on a phone and shows its own page when offline. Tests for the service worker's caching rules.

## Phase 6: Dev stack and pipeline

- [ ] Port the development Compose file with the Caddy reverse proxy in front, and the `just` recipes that start, stop and rebuild the stack. Port the worktree recipe, so a new worktree gets its environment files and virtual environment.

- [ ] Add the pipeline: one workflow that runs the hooks, the backend and frontend tests and the builds on every pull request.

## Phase 7: Run on the dev box

- [ ] Add a second Compose file for a long-running copy on the dev box, apart from the development stack and with its own database volume, and a `just` recipe to deploy the current `main` to it. It is served over HTTPS on the team's private network and is not reachable from the public internet. No address or machine name goes into the repository: they live in a gitignored environment file.

- [ ] Document how a team member installs the PWA on a phone from that address.

## Decisions

- **Split from the vision plan** - `/t-f` will not start while any box in a plan's open questions or jobs is unticked, and the vision plan's open items belong to phases far ahead. The skeleton has only one job, and it is needed only at its last phase.

- **Ported, not written fresh** - Quill Medical's tooling has already been through the problems a new project meets: worktrees sharing a virtual environment, hooks pointing at the wrong checkout, migrations that come out empty. Copying it saves relearning them.
