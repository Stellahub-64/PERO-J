#!/usr/bin/env bash
#
# Automated PostgreSQL backup using pg_dump.
#
# Configurable via environment variables (see .env.example):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   BACKUP_DIR      directory to write dumps into (default: ./backups)
#   RETENTION_DAYS  delete dumps older than N days (default: 7)
#
# Cron (daily at 02:00):
#   0 2 * * * cd /path/to/repo && ./scripts/backup.sh >> /var/log/pg-backup.log 2>&1
#
# Restore procedure: see docs/backup.md

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MIN_DUMP_BYTES=512

# Derive connection settings from DATABASE_URL when individual PG* vars are unset.
if [[ -n "${DATABASE_URL:-}" ]]; then
  : "${PGHOST:=$(printf '%s' "$DATABASE_URL" | sed -E 's#^[a-z]+://([^:@/]+)(:[^@/]*)?@([^:/]+)(:([0-9]+))?/([^?]+).*#\3#')}"
  : "${PGPORT:=$(printf '%s' "$DATABASE_URL" | sed -nE 's#^[a-z]+://([^:@/]+)(:[^@/]*)?@([^:/]+):([0-9]+)/([^?]+).*#\4#p')}"
  : "${PGUSER:=$(printf '%s' "$DATABASE_URL" | sed -E 's#^[a-z]+://([^:@/]+)(:[^@/]*)?@.*#\1#')}"
  : "${PGPASSWORD:=$(printf '%s' "$DATABASE_URL" | sed -nE 's#^[a-z]+://[^:@/]+:([^@/]*)@.*#\1#p')}"
  : "${PGDATABASE:=$(printf '%s' "$DATABASE_URL" | sed -E 's#^[a-z]+://[^?]*/([^?]+).*#\1#')}"
fi

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=soroban_explorer}"

export PGHOST PGPORT PGUSER PGDATABASE
[[ -n "${PGPASSWORD:-}" ]] && export PGPASSWORD

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.dump"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found in PATH" >&2
  exit 1
fi

echo "[backup] dumping ${PGDATABASE}@${PGHOST}:${PGPORT} -> ${DUMP_FILE}"

# Custom format (-Fc) supports selective restore via pg_restore.
if ! pg_dump -Fc -f "$DUMP_FILE"; then
  echo "ERROR: pg_dump failed" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

# Validate the dump is non-trivial (>512 bytes).
DUMP_SIZE="$(wc -c < "$DUMP_FILE" | tr -d ' ')"
if [[ "$DUMP_SIZE" -le "$MIN_DUMP_BYTES" ]]; then
  echo "ERROR: dump ${DUMP_FILE} is only ${DUMP_SIZE} bytes (expected > ${MIN_DUMP_BYTES})" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

echo "[backup] ok: ${DUMP_FILE} (${DUMP_SIZE} bytes)"

# Prune dumps older than RETENTION_DAYS.
if [[ "$RETENTION_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -maxdepth 1 -name "${PGDATABASE}_*.dump" -type f \
    -mtime "+${RETENTION_DAYS}" -print -delete
fi

echo "[backup] done"
