variable "project" {
  type = string
}

variable "image_retention_count" {
  description = "Number of most-recent images to keep; older ones are expired to bound storage cost."
  type        = number
  default     = 10
}

variable "tags" {
  type    = map(string)
  default = {}
}
