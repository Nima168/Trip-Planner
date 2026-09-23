#!/usr/bin/env bash
# Finds the most recent manual snapshot (see backup.sh's naming) and applies
# Terraform with restore_from_snapshot set, so RDS comes back with the last
# backed-up data instead of empty. See backend-spec.md §9 "Backup & Restore"
# for the two manual follow-ups this does NOT automate (ECR re-push via
# deploy.yml's workflow_dispatch, and updating Vercel's VITE_API_BASE_URL to
# the new CloudFront domain).
set -euo pipefail

PROJECT="${PROJECT:-musafir}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-${PROJECT}-db}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="${SCRIPT_DIR}/../environments/prod"

echo "Looking up the most recent manual snapshot for '${DB_INSTANCE_ID}'..."
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier "${DB_INSTANCE_ID}" \
  --snapshot-type manual \
  --region "${AWS_REGION}" \
  --query 'reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0].DBSnapshotIdentifier' \
  --output text)

if [[ -z "${LATEST_SNAPSHOT}" || "${LATEST_SNAPSHOT}" == "None" ]]; then
  echo "No manual snapshot found for '${DB_INSTANCE_ID}' — nothing to restore from." >&2
  echo "Run 'terraform apply' directly for a fresh empty database instead." >&2
  exit 1
fi

echo "Restoring from snapshot '${LATEST_SNAPSHOT}'..."
cd "${ENV_DIR}"
terraform apply -var="restore_from_snapshot=${LATEST_SNAPSHOT}" "$@"

cat <<EOF

Restore applied. Two manual follow-ups remain (backend-spec.md §9):
  1. ECR came back empty — trigger a deploy with no code changes:
       gh workflow run deploy.yml
  2. CloudFront got a new domain — update Vercel's VITE_API_BASE_URL to:
       $(terraform output -raw api_base_url)
     then redeploy the frontend (Vite bakes env vars in at build time).
EOF
