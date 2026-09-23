output "endpoint" {
  value = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = var.db_name
}

output "master_username" {
  value = var.master_username
}

output "security_group_id" {
  value = aws_security_group.rds.id
}

output "instance_id" {
  value = aws_db_instance.this.id
}
