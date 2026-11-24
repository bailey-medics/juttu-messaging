# Move to juttu-messaging plan

The messaging service started on 21 November 2026 as Bode, first in
`~/github/bode` and then in `~/github/bode-messaging`, after its GitHub
repository. The same day it was renamed Juttu, with a new repository,
`bailey-medics/juttu-messaging`. Every place that named Bode, the folder,
the tmux recipes and hooks, and the box's restart config, had to follow.

The outcome is one checkout at `~/github/juttu-messaging`, pushing to
`bailey-medics/juttu-messaging`. Its tmux sessions use the short name
`juttu`, and `juttu-<number>` for a worktree, the way Turva's use `turva`.

## Open questions

- [ ] **Is "Finnish for a chat or a story" the meaning to record in
      `CLAUDE.md`?** The Bode line said "Old English for messenger", and
      the new line was written without asking.

## Before running /f

- [x] Create `bailey-medics/juttu-messaging` on GitHub. Done 21 November 2026.
- [x] Give the `bailey-medics` fine-grained token access to
      `juttu-messaging`. Until then, `gh` and `git` on the dev box cannot
      see the repository: `gh repo view` could not resolve it on 21
      November 2026. Done: `gh` reaches it, checked 24 November 2026.
- [x] Delete or archive `bailey-medics/bode-messaging`. It holds no
      commits. **Irreversible** if deleted. Done: GitHub no longer finds
      it, checked 24 November 2026.

## Phase 1: Rename the checkout

- [x] Rename the project from Bode to Juttu in `CLAUDE.md`.
- [x] Point `origin` at
      `https://github.com/bailey-medics/juttu-messaging.git`. It was an
      SSH address before, but the dev box reaches `bailey-medics` over
      HTTPS with the fine-grained token, like the other clones.
- [x] Rename the folder `~/github/bode-messaging` to
      `~/github/juttu-messaging`.

## Phase 2: Update mark-house-style

- [x] `just/justfile`: `t c` and `t tw` accept the `juttu-messaging`
      folder and its `juttu-messaging-<number>` worktrees, and name their
      sessions `juttu` and `juttu-<number>`. These edits sit on top of the
      uncommitted Bode ones from the first move.
- [x] `claude/hooks/tab-topic.sh`: the tab-topic hook works in `juttu`
      and `juttu-<number>` sessions.
- [x] `claude/hooks/tab-topic.bats`: the Bode tests now test Juttu
      sessions.
- [x] `scripts/tmux/README.md`: the session names and the tab-title rule
      say Juttu.

## Phase 3: Update the box's restart config

- [x] `reboot-config`, the box's restart script, starts the `juttu`
      session in `~/github/juttu-messaging` at boot. It is kept with the
      box's own files, outside this repository.
- [x] The systemd service that runs it, and the README beside it, name
      the `juttu` session.
- [x] `~/.tmux.conf` titles a `juttu` session's tab "Juttu" and its
      topic. This file lives only on the dev box, outside any repository.

## Phase 4: Switch over

- [x] Reload tmux with `tmux source-file ~/.tmux.conf`. Done 21 November 2026, after the `juttu` tabs were found showing only the session name.
- [x] Close the old `bode` session, and open `juttu` with `t c` from
      `~/github/juttu-messaging`. Done: no `bode` session runs, checked
      24 November 2026.
- [x] Commit the changes in `mark-house-style` and to the box's restart
      config. Done: `mark-house-style` has nothing uncommitted, checked
      24 November 2026.
- [x] Make the first commit here, on `main`. Done 21 November 2026.

## Decisions

- **The sessions are named `juttu`, not `juttu-messaging`** - the same
  choice as for Bode: a short name keeps tab titles and `tmux ls`
  readable, and the folder keeps the repository's full name.
