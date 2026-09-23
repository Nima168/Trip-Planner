variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  description = "Docker image tag to deploy; the deploy pipeline overrides this per-release."
  type        = string
  default     = "latest"
}

variable "container_port" {
  type    = number
  default = 8000
}

variable "cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory (MiB)."
  type        = number
  default     = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "database_url_secret_arn" {
  type = string
}

variable "jwt_secret_arn" {
  type = string
}

variable "ai_api_key_secret_arn" {
  type = string
}

variable "allowed_origins" {
  description = "Comma-separated CORS origins (Vercel prod domain + *.vercel.app previews)."
  type        = string
}

variable "jwt_expiry_minutes" {
  type    = number
  default = 43200 # 30 days
}

variable "ai_enabled" {
  type    = bool
  default = false
}

variable "ai_provider" {
  type    = string
  default = "anthropic"
}

variable "ai_model" {
  type    = string
  default = "claude-haiku-4-5-20251001"
}

variable "ai_timeout_seconds" {
  type    = number
  default = 20
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
