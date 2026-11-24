set shell := ["bash", "-c"]

# These recipes are thin wrappers over the scripts in scripts/, which hold the
# one implementation of each repeated job. Use `just` for the short names,
# or call ./scripts/<script>.sh directly. Both work.

# Each developer's own global justfile, so their personal recipes run here as
# plain `just <recipe>`. Optional: skipped for anybody who has none. It must
# set nothing, such as `shell`, which this file sets, and must not reuse a
# recipe name from this file, or just will not load.
import? '~/.config/just/justfile'


default:
    @just --list


# Switch on the tracked git hook in .githooks, so every commit runs
# pre-commit on the staged files. Once per clone: the setting is shared by
# every worktree.
setup:
    @./scripts/install-hooks.sh


alias u := up
# Start the development stack: Juttu is then at http://localhost:8180
up *args:
    @./scripts/up.sh {{args}}


alias d := down
# Stop the development stack, keeping the database
down *args:
    @./scripts/down.sh {{args}}


alias rb := rebuild
# Rebuild the stack's images from the latest base images, then start it
rebuild *args:
    @./scripts/rebuild.sh {{args}}


alias wt := worktree
# Make a sibling worktree on a feature/ branch, ready to work in
worktree branch:
    @./scripts/worktree.sh {{branch}}


alias l := lint
# Run every check pre-commit enforces, over the whole repository
lint *args:
    @./scripts/lint.sh {{args}}


alias t := test
# Run every test suite
test:
    @./scripts/test.sh


alias ub := unit-tests-backend
# Run the backend tests in a throwaway container mounting this worktree
unit-tests-backend *args:
    @./scripts/test.sh backend {{args}}


# Make the first account on the dev stack, asking for its username and password
first-account:
    @./scripts/first-account.sh


alias m := migrate
# Write a migration for this worktree's model changes (throwaway database)
migrate message:
    @./scripts/migrate.sh new "{{message}}"


alias f := frontend
# Run the frontend gate, or one npm script (e.g. 'just f dev')
frontend *args:
    @./scripts/frontend.sh {{args}}


alias sb := storybook
# Start Storybook, the catalogue of components, on port 6106
storybook:
    @./scripts/frontend.sh storybook


alias bd := box-deploy
# Deploy the latest main to the long-running copy on the dev box
box-deploy:
    @./scripts/box.sh deploy


# What the long-running copy on the dev box is running
box-status:
    @./scripts/box.sh status


# Make the first account on the copy on the dev box
box-first-account:
    @./scripts/box.sh first-account

# Make the Web Push signing keys for the copy on the dev box, once, with
# the contact push services may write to: mailto:<address> or an https:// origin
box-push-keys contact:
    @./scripts/box.sh push-keys "{{ contact }}"


alias tf := terraform
# Run Terraform on the repository's GitHub settings (e.g. 'just tf plan')
terraform *args:
    @./scripts/terraform.sh {{args}}
