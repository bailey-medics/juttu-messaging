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

## Layout

| Path          | What it is                                                  |
| ------------- | ----------------------------------------------------------- |
| `docs/plans/` | Plan documents: what is being built, and the decisions made |

## Core invariants

- **The repository is public.** Nothing that locates or reaches the
  machines Juttu is built on goes into a tracked file: no private network
  address, no private network name, no device name, no MAC address. A
  plan that has to refer to one names it in angle brackets, such as
  `<the dev box's private network name>`.
- **No patient data, ever, in the first version.** It is for developers.
  Never put real patient data, credentials or secrets into the repository
  or into a test fixture.
- **Every endpoint makes an explicit authorisation decision.** None is
  open by accident. The public ones, such as the health check and sign-in,
  are public on purpose and say so.
- **Messages are append-only.** Nothing is edited in place; a correction is
  a new message that amends the old one.
- **Ported from Quill Medical, not written fresh**, where Quill already has
  the piece. Its tooling has been through the problems a new project meets.
  Its messaging code stays behind, because it assumes a patient on every
  conversation.
- **Ports of its own.** Juttu runs beside Quill Medical's and Turva's
  stacks on the same machine, so each port is about a hundred above the
  usual one and can be changed through a `JUTTU_*` variable in the
  gitignored root `.env`.
- **British English**, in prose, comments, docs and identifiers.

## Commands

There are none yet. Each phase of the skeleton plan adds its own here.

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
