#!/usr/bin/env bash
set -euo pipefail

SERVER="${ADS_DEPLOY_SERVER:-gioshio@94.77.149.222}"
SSH_KEY="${ADS_DEPLOY_KEY:-/Users/UserOne/.ssh/openclaw_admin_20260601}"
REMOTE_DIR="${ADS_REMOTE_DIR:-/home/gioshio/ad-ledger/app}"
DATA_DIR="${ADS_DATA_DIR:-/home/gioshio/ad-ledger/data}"
UPLOAD_DIR="${ADS_UPLOAD_DIR:-/home/gioshio/ad-ledger/uploads}"
REMOTE_DB_URL="file:${DATA_DIR}/prod.sqlite"

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude outputs \
  --exclude prisma/*.sqlite \
  -e "ssh -i ${SSH_KEY}" \
  ./ "${SERVER}:${REMOTE_DIR}/"

ssh -i "$SSH_KEY" "$SERVER" <<EOF
set -euo pipefail
mkdir -p "$DATA_DIR" "$UPLOAD_DIR" /home/gioshio/ad-ledger/backups
cd "$REMOTE_DIR"
export DATABASE_URL="$REMOTE_DB_URL"
export ADS_UPLOAD_DIR="$UPLOAD_DIR"
export ADS_DATA_DIR="$DATA_DIR"

if command -v nvm >/dev/null 2>&1; then
  nvm install 22
  nvm use 22
elif [ "\$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 22 ]; then
  echo "Node 22 LTS is required. Install nvm or NodeSource Node 22 before deploying." >&2
  exit 1
fi

npm ci
npm run db:generate
if [ ! -f "$DATA_DIR/prod.sqlite" ]; then
  mkdir -p "$DATA_DIR"
  sqlite3 "$DATA_DIR/prod.sqlite" < scripts/init-ads-sqlite.sql
fi
npm run build
pm2 start ecosystem.config.cjs --update-env || pm2 restart ad-ledger --update-env
pm2 save
EOF

echo "Deployed to ${SERVER}:${REMOTE_DIR}"
