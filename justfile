set shell := ["bash", "-c"]

# These recipes are thin wrappers over the scripts in s/, which hold the
# one implementation of each repeated job. Use `just` for the short names,
# or call ./s/<script> directly. Both work.

default:
    @just --list


# Switch on the tracked git hook in .githooks, so every commit runs
# pre-commit on the staged files. Once per clone: the setting is shared by
# every worktree.
setup:
    @./s/install-hooks


alias u := up
# Start the development stack: Juttu is then at http://localhost:8180
up *args:
    @./s/up {{args}}


alias d := down
# Stop the development stack, keeping the database
down *args:
    @./s/down {{args}}


alias rb := rebuild
# Rebuild the stack's images from the latest base images, then start it
rebuild *args:
    @./s/rebuild {{args}}


alias wt := worktree
# Make a sibling worktree on a feature/ branch, ready to work in
worktree branch:
    @./s/worktree {{branch}}


alias l := lint
# Run every check pre-commit enforces, over the whole repository
lint *args:
    @./s/lint {{args}}


alias t := test
# Run every test suite
test:
    @./s/test


alias ub := unit-tests-backend
# Run the backend tests in a throwaway container mounting this worktree
unit-tests-backend *args:
    @./s/test backend {{args}}


# Make the first account on the dev stack, asking for its username and password
first-account:
    @./s/first-account


alias m := migrate
# Write a migration for this worktree's model changes (throwaway database)
migrate message:
    @./s/migrate new "{{message}}"


alias f := frontend
# Run the frontend gate, or one npm script (e.g. 'just f dev')
frontend *args:
    @./s/frontend {{args}}


alias sb := storybook
# Start Storybook, the catalogue of components, on port 6106
storybook:
    @./s/frontend storybook


alias bd := box-deploy
# Deploy the latest main to the long-running copy on the dev box
box-deploy:
    @./s/box deploy


# What the long-running copy on the dev box is running
box-status:
    @./s/box status


# Make the first account on the copy on the dev box
box-first-account:
    @./s/box first-account

# Make the Web Push signing keys for the copy on the dev box, once, with
# the contact push services may write to: mailto:<address> or an https:// origin
box-push-keys contact:
    @./s/box push-keys "{{ contact }}"


alias tf := terraform
# Run Terraform on the repository's GitHub settings (e.g. 'just tf plan')
terraform *args:
    @./s/terraform {{args}}
