#!/usr/bin/env bash
# Snapshots RDS, then destroys the stack — only if the snapshot succeeded.
# Run this after each session to avoid paying the NAT Gateway/ALB hourly
# rate while the app sits idle (backend-spec.md §9 cost note).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="${SCRIPT_DIR}/../environments/prod"

echo "=== Step 1/2: backing up RDS before destroy ==="
if ! "${SCRIPT_DIR}/backup.sh"; then
  echo "Backup failed — aborting destroy. Nothing was torn down." >&2
  exit 1
fi

echo "=== Step 2/2: terraform destroy ==="
cd "${ENV_DIR}"
terraform destroy "$@"

echo "Destroy complete. Data is safe in the RDS snapshot taken above."
echo "Run scripts/restore.sh to bring the stack back with that data."
