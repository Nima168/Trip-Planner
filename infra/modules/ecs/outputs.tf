output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "cluster_arn" {
  value = aws_ecs_cluster.this.arn
}

output "service_name" {
  value = aws_ecs_service.backend.name
}

output "task_family" {
  value = aws_ecs_task_definition.backend.family
}

output "execution_role_arn" {
  value = aws_iam_role.execution.arn
}

output "task_role_arn" {
  value = aws_iam_role.task.arn
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.backend.name
}
