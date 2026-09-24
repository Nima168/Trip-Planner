variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "musafir"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "github_oidc_sub" {
  description = "See infra/modules/iam-oidc/variables.tf — decode a real GitHub Actions token to get this exact value."
  type        = string
}

variable "allowed_origins" {
  description = "Comma-separated CORS origins: the Vercel production domain + its *.vercel.app preview wildcard is not a literal wildcard here — list the exact production domain; preview-domain handling is app-side (backend-spec.md §9)."
  type        = string
}

variable "ai_api_key" {
  description = "Groq API key, stored into Secrets Manager for the ECS task. Pass via TF_VAR_ai_api_key on every apply. Sensitive."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ai_enabled" {
  type    = bool
  default = false
}

variable "ai_provider" {
  description = "Groq is the only supported provider; the backend refuses to start with anything else."
  type        = string
  default     = "groq"

  validation {
    condition     = var.ai_provider == "groq"
    error_message = "ai_provider must be \"groq\"."
  }
}

variable "ai_model" {
  description = "Groq model ID."
  type        = string
  default     = "openai/gpt-oss-120b"
}

variable "image_tag" {
  description = "Backend Docker image tag to deploy. The deploy pipeline normally manages the running task definition directly (see infra/README.md); this only matters for the first `apply` before any deploy has run."
  type        = string
  default     = "latest"
}

variable "restore_from_snapshot" {
  description = "RDS snapshot identifier to restore from; empty = fresh empty DB. Set by infra/scripts/restore.sh."
  type        = string
  default     = ""
}

variable "db_master_password_secret_name" {
  description = "Name of the persistent, non-Terraform-managed Secrets Manager secret bootstrapped once per infra/README.md."
  type        = string
  default     = "musafir/db-master-password-persistent"
}
