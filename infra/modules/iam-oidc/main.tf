# GitHub Actions OIDC → a narrowly-scoped deploy role, so no long-lived AWS
# access keys need to live in GitHub secrets.

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # SHA1 thumbprints of token.actions.githubusercontent.com's TLS chain
  # (intermediate + root), computed directly from a live handshake on
  # 2026-09-22 rather than copied from older tutorials — GitHub has since
  # moved this endpoint from DigiCert to Let's Encrypt, so pre-2023
  # published thumbprint values (commonly "6938fd4d98bab03...") are for the
  # wrong CA. AWS ignores this value for recognized providers like GitHub's
  # in practice, but Terraform still requires a syntactically valid one.
  # Re-derive if this ever fails to match (see infra/README.md):
  #   echo | openssl s_client -connect token.actions.githubusercontent.com:443 \
  #     -showcerts 2>/dev/null | openssl x509 -fingerprint -sha1 -noout
  thumbprint_list = [
    "ab9d0263244dd0326eb67015705a667e79cfe998", # root (ISRG)
    "2d74d6dfd96eea55ad7baafa0d3c6552b2dadc37", # intermediate (Let's Encrypt)
  ]

  tags = merge(var.tags, { Name = "${var.project}-github-oidc" })
}

data "aws_iam_policy_document" "github_deploy_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Exact match, not a wildcard — scoped to this one repo+branch's sub
    # claim. See variables.tf for why this can't be guessed in advance.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [var.github_oidc_sub]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${var.project}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_trust.json

  tags = merge(var.tags, { Name = "${var.project}-github-deploy" })
}

data "aws_iam_policy_document" "github_deploy_permissions" {
  statement {
    sid    = "EcrAuth"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [var.ecr_repository_arn]
  }

  # RegisterTaskDefinition/DescribeTaskDefinition don't support the
  # ecs:cluster condition key, so they're granted account-wide in their own
  # statement rather than mixed with the cluster-scoped actions below.
  statement {
    sid       = "EcsRegisterTaskDefinition"
    effect    = "Allow"
    actions   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
    resources = ["*"]
  }

  statement {
    sid    = "EcsDeploy"
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
      "ecs:RunTask",
      "ecs:DescribeTasks",
    ]
    resources = ["*"]
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [var.ecs_cluster_arn]
    }
  }

  statement {
    sid       = "PassRolesToEcs"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [var.execution_role_arn, var.task_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  dynamic "statement" {
    for_each = length(var.secret_arns) > 0 ? [1] : []
    content {
      sid       = "ReadDeploySecrets"
      effect    = "Allow"
      actions   = ["secretsmanager:GetSecretValue"]
      resources = var.secret_arns
    }
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project}-github-deploy-policy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy_permissions.json
}
