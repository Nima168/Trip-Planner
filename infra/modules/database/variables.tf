variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "master_username" {
  type    = string
  default = "musafir_admin"
}

variable "master_password" {
  description = "Read from the persistent musafir/db-master-password-persistent secret (see infra/README.md) — never random_password. Sensitive."
  type        = string
  sensitive   = true
}

variable "db_name" {
  type    = string
  default = "musafir"
}

variable "instance_class" {
  description = "db.t4g.micro is free-tier eligible for a new account's first 12 months."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  type    = number
  default = 20
}

variable "engine_version" {
  type    = string
  default = "16"
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "restore_from_snapshot" {
  description = "RDS snapshot identifier to restore from instead of creating an empty DB; empty string = fresh DB."
  type        = string
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
