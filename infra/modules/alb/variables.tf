variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "container_port" {
  description = "Port the backend container listens on; the target group forwards here."
  type        = number
  default     = 8000
}

variable "tags" {
  type    = map(string)
  default = {}
}
