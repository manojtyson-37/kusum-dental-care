#!/usr/bin/env bash
# Dumps the production Supabase database (schema + data) to a timestamped
# file under backend/backups/. Requires the Supabase CLI and a personal
# access token with access to the project.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=<token> SUPABASE_DB_PASSWORD=<db password> ./backend/scripts/backup-supabase.sh
#
# The DB password is the project's Postgres password (set at project
# creation, resettable at supabase.com/dashboard/project/_/settings/database)
# — it is NOT the same as SUPABASE_SERVICE_ROLE_KEY or the CLI access token.
#
# Restore (into a fresh/empty Postgres instance, e.g. to verify the backup
# or to recover from data loss):
#   psql "<connection-string>" -f backend/backups/<file>.sql
#
# Run this periodically (e.g. before risky migrations, or on a monthly
# schedule) — it is not wired into CI, since it writes production data to
# disk and should be a deliberate, reviewed action.

set -euo pipefail

PROJECT_REF="hbixyyanxbfqyeksbcur"
OUT_DIR="$(dirname "$0")/../backups"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$OUT_DIR/backup-${TIMESTAMP}.sql"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "SUPABASE_ACCESS_TOKEN is required (supabase.com/dashboard/account/tokens)" >&2
  exit 1
fi
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "SUPABASE_DB_PASSWORD is required (supabase.com/dashboard/project/_/settings/database)" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

npx supabase db dump \
  --project-ref "$PROJECT_REF" \
  --password "$SUPABASE_DB_PASSWORD" \
  --file "$OUT_FILE"

echo "Backup written to $OUT_FILE"
echo "Verify with: grep -c '^INSERT INTO' \"$OUT_FILE\" (or open and eyeball table coverage)"
