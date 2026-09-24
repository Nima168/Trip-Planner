output "api_base_url" {
  description = "API URL through the ALB while CloudFront is unavailable."
  value       = "http://${module.alb.alb_dns_name}/api/v1"
}

# CloudFront is temporarily disabled because AWS account verification
# is required before creating CloudFront resources.
# output "cloudfront_domain_name" {
#   value = module.cdn.cloudfront_domain_name
# }

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_task_family" {
  value = module.ecs.task_family
}

output "github_deploy_role_arn" {
  value = module.iam_oidc.deploy_role_arn
}

output "ecs_private_subnet_ids" {
  description = "For the deploy workflow's one-off `aws ecs run-task` migration call — same network as the running service."
  value       = module.network.private_subnet_ids
}

output "ecs_security_group_id" {
  description = "For the deploy workflow's one-off `aws ecs run-task` migration call."
  value       = module.ecs.ecs_security_group_id
}

output "db_endpoint" {
  value     = module.database.endpoint
  sensitive = true
}

output "db_instance_id" {
  value = module.database.instance_id
}
