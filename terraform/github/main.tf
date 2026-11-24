# The settings of Juttu's own GitHub repository, kept as code so a change
# to them goes through a pull request like any other. See docs/terraform.md.
#
# Every setting is written out, with the value the repository had when
# Terraform took it over, so a plan shows only what was meant to change.

provider "github" {
  owner = "bailey-medics"
}

# Takes over the repository that already exists, rather than making one.
# Once it is in the state, Terraform skips this.
import {
  to = github_repository.juttu_messaging
  id = "juttu-messaging"
}

resource "github_repository" "juttu_messaging" {
  name       = "juttu-messaging"
  visibility = "public"

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = false

  allow_merge_commit          = true
  allow_squash_merge          = true
  allow_rebase_merge          = true
  allow_auto_merge            = false
  allow_update_branch         = false
  merge_commit_title          = "MERGE_MESSAGE"
  merge_commit_message        = "PR_TITLE"
  squash_merge_commit_title   = "COMMIT_OR_PR_TITLE"
  squash_merge_commit_message = "COMMIT_MESSAGES"

  # A pull request's branch is deleted once it merges. GitHub then moves
  # any pull request based on that branch, the next one up a stack, onto
  # the branch it merged into.
  delete_branch_on_merge = true

  web_commit_signoff_required = false

  # Destroying this resource archives the repository; it never deletes it.
  archive_on_destroy = true

  lifecycle {
    prevent_destroy = true
  }
}
