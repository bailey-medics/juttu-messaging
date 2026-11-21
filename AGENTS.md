# Agent instructions

Juttu is an open-source messaging service, open to anyone but built first
for healthcare. The name is Finnish for a chat or a story. Its first users
are the four people building Turva: a software team talking with its build
pipeline and its AI agents in one quiet place. Clinicians talking to
clinicians, and then to patients, come later.

This file is the entry point for AI coding agents. Read it before changing
anything. `CLAUDE.md` only points here.

## Read first

- [The vision and first version plan](docs/plans/2026-11-21-juttu-vision-and-first-version-plan.md):
  what Juttu is for, the phases and the decisions behind them.
- [The skeleton plan](docs/plans/2026-11-21-juttu-skeleton-plan.md): the
  empty shell every later phase stands on.
- [The copy on the dev box](docs/dev-box.md): deploying it, and installing
  Juttu on a phone.

## Layout

| Path          | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `backend/`    | The Django app, with DRF. Each test sits beside its module, as `*_test.py` |
| `frontend/`   | The React, Mantine and Vite app, with Storybook                            |
| `caddy/dev/`  | Caddy in front of the dev stack: one origin for app and API                |
| `docs/plans/` | Plan documents: what is being built, and the decisions made                |
| `s/`          | Scripts, one for each repeated job. The `justfile` wraps them              |
| `s/tests/`    | bats tests for the scripts and the git hook                                |
| `.githooks/`  | The tracked git hook. `just setup` switches it on, once a clone            |

## Core invariants

- **The repository is public.** Nothing that locates or reaches the
  machines Juttu is built on goes into a tracked file: no private network
  address, no private network name, no device name, no MAC address. A
  plan that has to refer to one names it in angle brackets, such as
  `<the dev box's private network name>`. The `check-home-details` hook
  refuses the patterns, and each machine can list its own literals in
  `local/home-details-denylist`, which is never committed.
- **No patient data, ever, in the first version.** It is for developers.
  Never put real patient data, credentials or secrets into the repository
  or into a test fixture.
- **Every endpoint makes an explicit authorisation decision.** None is
  open by accident. Django REST framework's default is "signed in only",
  so a view nobody thought about is closed. The public ones, such as the
  health check and sign-in, are public on purpose and say so with
  `permission_classes = [AllowAny]`.
- **Messages are append-only.** Nothing is edited in place; a correction is
  a new message that amends the old one.
- **Ported from Quill Medical, not written fresh**, where Quill already has
  the piece. Its tooling has been through the problems a new project meets.
  Its messaging code stays behind, because it assumes a patient on every
  conversation.
- **Ports of its own.** Juttu runs beside Quill Medical's and Turva's
  stacks on the same machine, so each port is about a hundred above the
  usual one and can be changed through a `JUTTU_*` variable in the
  gitignored root `.env`; `.env.example` lists them. The Compose project
  is `juttu`, so no container or volume shares another stack's name.
- **The dev stack listens on this machine only**, unless `JUTTU_BIND`
  says otherwise.
- **The copy on the dev box runs only what is on `main`.** `s/box deploy`
  builds from a clean export of `origin/main`, never a working tree. It is
  reached only through the private network's HTTPS proxy, and its
  settings, the address among them, live in `local/box.env`.
- **British English**, in prose, comments, docs and identifiers. cspell
  checks the documents with `en-GB`. A new word goes in
  `cspell.config.json`, in alphabetical order, never in an inline comment.
- **Every backend function is typed.** mypy runs in strict mode over
  `backend/`, and the packages its hook installs are pinned to
  `backend/poetry.lock`. Bump them together.
- **A migration is written with `just migrate`, never by hand against the
  dev stack's database.** It autogenerates against a throwaway Postgres
  from this worktree's models, and refuses an empty result. `./s/test`
  checks every migration applies, undoes and matches the models.
- **A merged migration is never edited.** A change is a new migration.
- **The backend container runs as an unprivileged user**, uid 10001.
  Never run it as root.
- **Juttu wears Quill Medical's colours**: navy and amber, from
  `frontend/src/brand.json`, through the theme in `frontend/src/theme.ts`.
  `theme.test.ts` holds every text colour to WCAG AA contrast in both
  colour schemes, so a colour change that would fail an accessibility check
  fails there first.
- **Type guards, not `as`, in the frontend.** ESLint refuses a type
  assertion, so anything read from the network is checked by a guard such
  as `isHealthResponse`.
- **Every component has a story**, and `src/stories.test.tsx` renders
  every story, so a broken one fails the unit tests.
- **The service worker never caches an API answer.** `/api/` requests go
  to the network or fail; an old copy shown as current is worse than an
  error. The rules are in `frontend/src/pwa/cachingRules.ts`, with tests.
- **npm runs no package's install script unless `allowScripts` in
  `frontend/package.json` allows it.**
- **GitHub Actions are pinned to full commit SHAs**, with a `# vX.Y.Z`
  comment. Check the tag's commit on the action's own repository before
  bumping one; never pin from memory. zizmor and actionlint audit every
  workflow on each commit.
- **`LICENSE` is kept byte for byte.** It is the Free Software
  Foundation's AGPL-3.0 text, so the whitespace hooks leave it alone.

## Building views

Juttu builds every view from its own Storybook components, as Quill
Medical does. When building UI, follow this order:

1. **Reuse an existing Storybook component.** Check `frontend/src/components/`
   and Storybook first.
2. **Compose a new component from existing ones.**
3. **Build from scratch only when nothing fits.** Plan the new component,
   with its `.stories.tsx` and `.test.tsx`, and show the plan to a person
   before building it.

All reusable UI lives in `frontend/src/components/`, with stories. Pages
use components; a page holds no reusable UI of its own. Where a page needs
a component that does not exist, build the component first, then use it
in the page.

`HomePage` and `NotFoundPage` still use Mantine's `Title`, `Text` and
`Stack` directly, because Juttu has no typography components yet. They move
onto Juttu's own components when those are ported from Quill Medical.

## Commands

```sh
just setup    # switch on the tracked git hook, once per clone
./s/up        # start the dev stack: Juttu is at http://localhost:8180
./s/down      # stop it, keeping the database
./s/rebuild   # rebuild its images after a dependency change
just worktree feature/<name>   # a sibling worktree, ready to work in
just box-deploy   # deploy the latest main to the copy on the dev box
./s/lint      # every check pre-commit enforces, over the whole repository
./s/test      # every test suite: bats on the host, pytest in a container
just ub       # the backend tests only, with pytest's arguments
just migrate "<message>"   # write a migration for a model change
./s/frontend  # the frontend gate: types, lint, format, tests, both builds
just storybook   # Storybook, on port 6106
```

Each `just` recipe is a thin wrapper over a script in `s/`. Each phase of
the skeleton plan adds its own commands here.

## Before every commit

```sh
./s/lint
./s/test
./s/frontend  # when the change touches frontend/
```

Do not commit red. CI runs the same three on every pull request and every
push to `main`, in `.github/workflows/ci.yml`.

## Git workflow

- Never commit or push directly to `main`. Every change goes on its own
  `feature/*` branch and reaches `main` through a pull request, stacked
  with `gh stack`.
- Use conventional commit messages (`feat(area):`, `fix:`, `docs:`,
  `chore(deps):`, `ci:`).
- Ask if the right path is unclear.

## Approval required

Ask before publishing releases, deleting branches, force-pushing, changing
secrets, closing or merging pull requests, changing repository settings,
or taking any other action that is visible outside this repository.

Never commit a `.env` file.
