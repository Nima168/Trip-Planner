terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Partial backend config — the bucket/table are created once, out-of-band,
  # per infra/README.md's bootstrap step (backend-spec.md §10 Open
  # Questions), not managed by this config. Fill in via:
  #   terraform init -backend-config=backend.hcl
  # (backend.hcl is gitignored; infra/README.md documents its contents.)
  backend "s3" {
    key     = "musafir/prod/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}

locals {
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# --- Persistent, non-Terraform-managed secrets (bootstrapped once; see
# infra/README.md) ---

data "aws_secretsmanager_secret" "db_master_password" {
  name = var.db_master_password_secret_name
}

data "aws_secretsmanager_secret_version" "db_master_password" {
  secret_id = data.aws_secretsmanager_secret.db_master_password.id
}

# --- Network ---

module "network" {
  source  = "../../modules/network"
  project = var.project
  tags    = local.tags
}

# --- ECR ---

module "ecr" {
  source  = "../../modules/ecr"
  project = var.project
  tags    = local.tags
}

# --- ALB (public-facing, HTTP only — CloudFront terminates HTTPS) ---

module "alb" {
  source            = "../../modules/alb"
  project           = var.project
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  tags              = local.tags
}

# --- Database (RDS Postgres, private subnets only) ---

module "database" {
  source                = "../../modules/database"
  project               = var.project
  vpc_id                = module.network.vpc_id
  private_subnet_ids    = module.network.private_subnet_ids
  master_password       = data.aws_secretsmanager_secret_version.db_master_password.secret_string
  restore_from_snapshot = var.restore_from_snapshot
  tags                  = local.tags
}

# Added here (not inside modules/database) to avoid a module cycle: RDS's SG
# needs ECS's SG id, ECS's task definition needs RDS's endpoint (via the
# database_url secret below).
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.database.security_group_id
  source_security_group_id = module.ecs.ecs_security_group_id
}

# --- Secrets consumed by the ECS task ---

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/jwt-secret"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project}/database-url"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = format(
    "postgresql+psycopg://%s:%s@%s:%s/%s",
    module.database.master_username,
    data.aws_secretsmanager_secret_version.db_master_password.secret_string,
    module.database.endpoint,
    module.database.port,
    module.database.db_name,
  )
}

resource "aws_secretsmanager_secret" "ai_api_key" {
  name                    = "${var.project}/ai-api-key"
  recovery_window_in_days = 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "ai_api_key" {
  secret_id     = aws_secretsmanager_secret.ai_api_key.id
  secret_string = var.ai_enabled ? var.ai_api_key : "AI_DISABLED"
}

# --- ECS (Fargate service running the backend) ---

module "ecs" {
  source = "../../modules/ecs"

  project                 = var.project
  vpc_id                  = module.network.vpc_id
  private_subnet_ids      = module.network.private_subnet_ids
  alb_security_group_id   = module.alb.alb_security_group_id
  target_group_arn        = module.alb.target_group_arn
  ecr_repository_url      = module.ecr.repository_url
  image_tag               = var.image_tag
  database_url_secret_arn = aws_secretsmanager_secret.database_url.arn
  jwt_secret_arn          = aws_secretsmanager_secret.jwt_secret.arn
  ai_api_key_secret_arn   = aws_secretsmanager_secret.ai_api_key.arn
  allowed_origins         = var.allowed_origins
  ai_enabled              = var.ai_enabled
  tags                    = local.tags
}

# --- CloudFront (HTTPS in front of the ALB) ---

# module "cdn" {
#  source       = "../../modules/cdn"
#  project      = var.project
#  alb_dns_name = module.alb.alb_dns_name
#  tags         = local.tags
#}

# --- GitHub Actions OIDC deploy role ---

module "iam_oidc" {
  source = "../../modules/iam-oidc"

  project            = var.project
  github_oidc_sub    = var.github_oidc_sub
  ecr_repository_arn = module.ecr.repository_arn
  ecs_cluster_arn    = module.ecs.cluster_arn
  execution_role_arn = module.ecs.execution_role_arn
  task_role_arn      = module.ecs.task_role_arn
  secret_arns = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.ai_api_key.arn,
  ]
  tags = local.tags
}
