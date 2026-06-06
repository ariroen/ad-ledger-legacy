#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${ADS_DATA_DIR:-/home/gioshio/ad-ledger/data}"
UPLOAD_DIR="${ADS_UPLOAD_DIR:-/home/gioshio/ad-ledger/uploads}"
BACKUP_DIR="${ADS_BACKUP_DIR:-/home/gioshio/ad-ledger/backups}"
KEEP_DAYS="${ADS_BACKUP_KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
DB_FILE="${DATA_DIR}/prod.sqlite"
SNAPSHOT_DIR="${BACKUP_DIR}/${STAMP}"

mkdir -p "$SNAPSHOT_DIR"

if [[ -f "$DB_FILE" ]]; then
  sqlite3 "$DB_FILE" ".backup '${SNAPSHOT_DIR}/prod.sqlite'"
fi

if [[ -d "$UPLOAD_DIR" ]]; then
  tar -C "$(dirname "$UPLOAD_DIR")" -czf "${SNAPSHOT_DIR}/uploads.tar.gz" "$(basename "$UPLOAD_DIR")"
fi

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Backup created: $SNAPSHOT_DIR"
