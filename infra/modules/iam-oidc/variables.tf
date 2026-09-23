variable "project" {
  type = string
}

variable "github_oidc_sub" {
  description = <<-EOT
    The exact `sub` claim GitHub's OIDC token presents for this repo/branch,
    e.g. "repo:OWNER@12345/REPO@67890:ref:refs/heads/trip_planner.AI".
    GitHub embeds immutable numeric owner/repo IDs, not the plain
    "OWNER/REPO" form — decode a real token in a debug workflow step to get
    the exact string (see infra/README.md) rather than guessing it here.
  EOT
  type        = string
}

variable "ecr_repository_arn" {
  type = string
}

variable "ecs_cluster_arn" {
  type = string
}

variable "secret_arns" {
  description = "Secrets Manager ARNs the deploy role may read (for the one-off migration task)."
  type        = list(string)
  default     = []
}

variable "execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
