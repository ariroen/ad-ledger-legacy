#!/usr/bin/env zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  source "$ROOT/.env.local"
  set +a
fi

exec python3 "$ROOT/tools/telegram_inbox_bot.py" "$@"
