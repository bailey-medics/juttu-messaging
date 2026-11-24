# Terraform and the GitHub provider this configuration is written for.
# .terraform.lock.hcl pins the provider's exact build; bump the two together
# with `scripts/terraform.sh init -upgrade`.

terraform {
  required_version = ">= 1.5"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }

  # The state lives in local/, which git ignores, so it never reaches the
  # public repository. A fresh clone rebuilds it from the import block in
  # main.tf on its first apply.
  backend "local" {
    path = "../../local/terraform/github.tfstate"
  }
}
