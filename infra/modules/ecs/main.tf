resource "aws_ecs_cluster" "this" {
  name = "${var.project}-cluster"

  tags = merge(var.tags, { Name = "${var.project}-cluster" })
}

resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs-sg"
  description = "Backend ECS tasks - inbound only from the ALB, outbound to RDS/internet via NAT."
  vpc_id      = var.vpc_id

  ingress {
    description     = "From ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-ecs-sg" })
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}-backend"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, { Name = "${var.project}-backend-logs" })
}

# --- IAM ---

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = merge(var.tags, { Name = "${var.project}-ecs-execution" })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      var.database_url_secret_arn,
      var.jwt_secret_arn,
      var.ai_api_key_secret_arn,
    ]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "${var.project}-ecs-execution-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# Task role: the app itself doesn't call any AWS APIs at runtime, so this
# stays empty — present for the future rather than granted broad permissions
# it doesn't need today.
resource "aws_iam_role" "task" {
  name               = "${var.project}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = merge(var.tags, { Name = "${var.project}-ecs-task" })
}

# --- Task definition & service ---

locals {
  container_name = "backend"
  image          = "${var.ecr_repository_url}:${var.image_tag}"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = local.image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [
        # Backend reads this as CORS_ORIGINS (app/config.py's `cors_origins`
        # field, per pydantic-settings' default env-var-name mapping) — not
        # ALLOWED_ORIGINS, despite backend-spec.md §9 using that name loosely.
        { name = "CORS_ORIGINS", value = var.allowed_origins },
        { name = "JWT_EXPIRY_MINUTES", value = tostring(var.jwt_expiry_minutes) },
        { name = "AI_ENABLED", value = tostring(var.ai_enabled) },
        { name = "AI_PROVIDER", value = var.ai_provider },
        { name = "AI_MODEL", value = var.ai_model },
        { name = "AI_TIMEOUT_SECONDS", value = tostring(var.ai_timeout_seconds) },
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.database_url_secret_arn },
        { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn },
        { name = "AI_API_KEY", valueFrom = var.ai_api_key_secret_arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = merge(var.tags, { Name = "${var.project}-backend-task" })
}

data "aws_region" "current" {}

resource "aws_ecs_service" "backend" {
  name            = "${var.project}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = local.container_name
    container_port   = var.container_port
  }

  # The deploy pipeline registers a new task definition revision and updates
  # this service directly (outside Terraform, per infra/README.md) — don't
  # fight that with a stale task_definition value on the next `apply`.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(var.tags, { Name = "${var.project}-backend-service" })
}
