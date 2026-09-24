#!/usr/bin/env bash
# Takes a manual RDS snapshot and waits for it to finish. Exits non-zero if
# the snapshot doesn't complete, so callers (destroy.sh) can refuse to
# proceed. See backend-spec.md §9 "Backup & Restore" for why this is a
# manual snapshot rather than Terraform's final_snapshot_identifier.
set -euo pipefail

PROJECT="${PROJECT:-musafir}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-${PROJECT}-db}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SNAPSHOT_ID="${PROJECT}-manual-$(date -u +%Y%m%dT%H%M%SZ)"

echo "Checking DB instance '${DB_INSTANCE_ID}' exists in ${AWS_REGION}..."
if ! aws rds describe-db-instances \
    --db-instance-identifier "${DB_INSTANCE_ID}" \
    --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "No DB instance '${DB_INSTANCE_ID}' found — nothing to back up." >&2
  exit 1
fi

echo "Creating snapshot '${SNAPSHOT_ID}'..."
aws rds create-db-snapshot \
  --db-instance-identifier "${DB_INSTANCE_ID}" \
  --db-snapshot-identifier "${SNAPSHOT_ID}" \
  --region "${AWS_REGION}" >/dev/null

echo "Waiting for snapshot to complete (this can take several minutes)..."
if ! aws rds wait db-snapshot-completed \
    --db-snapshot-identifier "${SNAPSHOT_ID}" \
    --region "${AWS_REGION}"; then
  echo "Snapshot '${SNAPSHOT_ID}' did not complete successfully. Refusing to continue." >&2
  exit 1
fi

echo "Snapshot '${SNAPSHOT_ID}' complete."
echo "${SNAPSHOT_ID}"
