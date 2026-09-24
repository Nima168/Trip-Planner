# Musafir Travels — AWS Infrastructure (Terraform)

Implements `specs_new/backend-spec.md` §9 ("Environment & Deployment") and
the plan's Phase 6. Fargate ECS + RDS Postgres + ALB + CloudFront + ECR,
network-isolated in a VPC, deployed via GitHub Actions OIDC (no static AWS
keys in GitHub).

**Status: code only.** Nothing in this directory has been applied against a
real AWS account from this session — there is no AWS CLI or Terraform binary
installed in this environment, and the one-time manual bootstrap below
(Phase 0 of the plan) hasn't been confirmed as done. Treat every module as
unverified until a `terraform plan`/`apply` has actually been run.

## Layout

```
infra/
  environments/prod/   # root module: wires the modules below together
  modules/
    network/            # VPC, public/private subnets, single NAT Gateway
    database/            # RDS Postgres, security group (ingress added in root)
    ecr/                 # backend Docker image repository
    ecs/                 # Fargate cluster/service/task def, execution/task roles
    alb/                 # HTTP:80 listener + target group, /health check
    cdn/                 # CloudFront in front of the ALB (HTTPS termination)
    iam-oidc/             # GitHub OIDC provider + scoped deploy role
  scripts/
    backup.sh             # manual RDS snapshot, waits for completion
    destroy.sh             # backup.sh, then terraform destroy (only if backup succeeded)
    restore.sh              # latest snapshot -> terraform apply -var=restore_from_snapshot=<id>
```

## One-time manual bootstrap (before the first `terraform init`)

These are deliberately **not** Terraform-managed — see
`backend-spec.md` §9/§10 for why (a Terraform-state backend can't bootstrap
itself, and the DB master password must survive `destroy`/`apply` cycles,
which rules out `random_password`).

1. **Confirm AWS account/region access:**
   ```bash
   aws sts get-caller-identity
   ```
2. **S3 bucket + DynamoDB table for Terraform remote state:**
   ```bash
   aws s3api create-bucket --bucket musafir-terraform-state-<your-account-id> \
     --region us-east-1
   aws s3api put-bucket-versioning --bucket musafir-terraform-state-<your-account-id> \
     --versioning-configuration Status=Enabled
   aws dynamodb create-table --table-name musafir-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```
   Copy `environments/prod/backend.hcl.example` → `backend.hcl` (gitignored)
   with the real bucket/table names.
3. **Persistent RDS master password secret** (created once, never destroyed
   by `terraform destroy` — this is what makes `backup.sh`/`restore.sh`
   round-trips work without a password mismatch):
   ```bash
   aws secretsmanager create-secret \
     --name musafir/db-master-password-persistent \
     --secret-string "$(openssl rand -base64 32)"
   ```

## Getting `github_oidc_sub`

Don't guess the `sub` claim format — GitHub embeds immutable numeric
owner/repo IDs (`repo:OWNER@12345/REPO@67890:ref:refs/heads/BRANCH`), not
the plain `OWNER/REPO` form older docs describe. Add a temporary debug step
to a workflow run on `trip_planner.AI` to print the real value:

```yaml
permissions:
  id-token: write
steps:
  - name: Debug OIDC token
    run: |
      curl -sH "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
        "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | \
        cut -d. -f2 | base64 -d | python3 -m json.tool
```

Copy the `sub` field into `terraform.tfvars` (or `TF_VAR_github_oidc_sub`),
then delete the debug step.

## Normal usage

```bash
cd environments/prod
terraform init -backend-config=backend.hcl
terraform plan   -var-file=terraform.tfvars
terraform apply  -var-file=terraform.tfvars
```

- First apply creates an empty database (`restore_from_snapshot` defaults to
  `""`) and a service with no image yet — the first real deploy comes from
  `.github/workflows/deploy.yml` (Phase 7), which registers a new task
  definition revision and updates the service directly; Terraform then
  leaves `task_definition`/`desired_count` alone on subsequent applies
  (`lifecycle.ignore_changes` in `modules/ecs`).
- `terraform output api_base_url` is the value for the frontend's
  `VITE_API_BASE_URL` (`frontend-spec.md` §10).

## GitHub Actions deploy pipeline setup

`.github/workflows/deploy.yml` (Phase 7) needs these as repository
**Variables** (Settings → Secrets and variables → Actions → Variables tab —
not Secrets; none of them are sensitive, since auth to AWS is via OIDC, not
static keys). Set them once after the first `terraform apply`:

| Variable | `terraform output` source |
|---|---|
| `AWS_REGION` | the `aws_region` you applied with |
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` |
| `ECR_REPOSITORY` | `ecr_repository_url` (just the repo name after the last `/`) |
| `ECS_CLUSTER` | `ecs_cluster_name` |
| `ECS_SERVICE` | `ecs_service_name` |
| `ECS_TASK_FAMILY` | `ecs_task_family` |
| `ECS_PRIVATE_SUBNET_IDS` | `ecs_private_subnet_ids`, joined with commas, no spaces |
| `ECS_SECURITY_GROUP_ID` | `ecs_security_group_id` |
| `API_BASE_URL` | `api_base_url` |

A push to `trip_planner.AI` then runs: CI (backend/frontend tests, lint,
build) → build & push the Docker image (tagged with the commit SHA) → run
`alembic upgrade head` as a one-off ECS task → register a new task
definition revision and roll the service, waiting for it to stabilize →
`curl` the CloudFront `/health` URL. `workflow_dispatch` runs the same
pipeline on demand — needed for a no-code-change redeploy after
`scripts/restore.sh` (see Cost note below), since a restore always leaves
ECR empty.

## Cost note

NAT Gateway and ALB are billed **hourly**, not as flat monthly fees. This
stack is meant to be spun up for a session and torn down, not left running:

```bash
../scripts/destroy.sh    # snapshots RDS first, refuses to destroy if the snapshot fails
../scripts/restore.sh    # restores the latest snapshot on the next apply
```

After a `restore.sh`, two manual follow-ups are required (not automated —
see `backend-spec.md` §9 for why): re-run the deploy workflow
(`gh workflow run deploy.yml`) since ECR comes back empty, and update
Vercel's `VITE_API_BASE_URL` to the new CloudFront domain the restore
printed, then redeploy the frontend.

## What's intentionally out of scope here

- No ACM cert / custom domain — CloudFront's default `*.cloudfront.net`
  domain is the HTTPS endpoint (backend-spec.md §9).
- No staging/PR-preview environment tier — single `prod` environment only.
- No automated snapshot cleanup — old manual snapshots accumulate a small
  storage cost until pruned by hand.
