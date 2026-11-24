# The repository's GitHub settings, in Terraform

Juttu's own GitHub settings are kept as code, in `terraform/github/`, so a
change to them is reviewed in a pull request like any other change. For
now that is the repository itself, `github_repository.juttu_messaging` in
`terraform/github/main.tf`. Its main rule is that a pull request's branch
is deleted once the pull request merges.

## Running it

```sh
just tf plan    # show what would change on GitHub, changing nothing
just tf apply   # make the change, after showing it and asking
```

`just tf` is `s/terraform`, which runs any Terraform command in
`terraform/github/`. The first run initialises the directory.

It needs two things on the machine:

1. **Terraform**, from HashiCorp, at version 1.5 or later.
2. **A GitHub token.** `s/terraform` uses `GITHUB_TOKEN`, or the token
   `gh` is signed in with when that is unset. Planning only reads. Applying
   changes the repository's settings, so it needs a token that may do so:
   on a fine-grained token, Administration write on this repository.

Applying changes a setting visible to everyone who works on the
repository, so `AGENTS.md` asks for approval first.

## The state

Terraform keeps its record of the repository in
`local/terraform/github.tfstate`, which git ignores, so it never reaches
the public repository. Each machine keeps its own. On a machine with no
state, the `import` block in `main.tf` takes over the existing repository
on the first apply, instead of trying to make a new one.

## Safety

- **Every setting is written out**, with the value it had when Terraform
  took the repository over, so a plan shows only what was meant to change.
- **The repository cannot be destroyed from here.** `prevent_destroy`
  refuses it, and if that were removed, `archive_on_destroy` would archive
  the repository instead of deleting it.

## Branches deleted on merge, and stacks

With `delete_branch_on_merge`, GitHub deletes a pull request's branch once
it merges. A pull request stacked on that branch is then moved onto the
branch it merged into, so the next pull request up a `gh stack` stack moves
onto `main` rather than being closed.
