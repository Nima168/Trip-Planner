#!/bin/sh
set -e

# Migrations run as a one-off ECS task from the deploy pipeline
# (.github/workflows/deploy.yml), not here — running `alembic upgrade head`
# on every container start would race when multiple tasks start concurrently
# during a rolling deploy. See specs_new/backend-spec.md §9.
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${WEB_CONCURRENCY:-4}"
