#!/usr/bin/env python3
"""
Tiny Telegram inbox bridge.

Run it with TELEGRAM_BOT_TOKEN set. It writes every incoming/forwarded message
to outputs/telegram_inbox/messages.jsonl so Codex can read the project inbox.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_OUTBOX = ROOT / "outputs" / "telegram_inbox"


def api_request(token: str, method: str, payload: dict | None = None) -> dict:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("ok"):
        raise RuntimeError(f"Telegram API error in {method}: {result}")
    return result["result"]


def download_file(token: str, file_id: str, output_dir: pathlib.Path) -> str | None:
    file_info = api_request(token, "getFile", {"file_id": file_id})
    file_path = file_info.get("file_path")
    if not file_path:
        return None

    target = output_dir / "files" / file_path
    target.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://api.telegram.org/file/bot{token}/{urllib.parse.quote(file_path)}"
    with urllib.request.urlopen(url, timeout=90) as response:
        target.write_bytes(response.read())
    return str(target)


def best_photo_file_id(message: dict) -> str | None:
    photos = message.get("photo") or []
    if not photos:
        return None
    return max(photos, key=lambda item: item.get("file_size") or 0).get("file_id")


def collect_attachment_file_ids(message: dict) -> list[tuple[str, str]]:
    attachments: list[tuple[str, str]] = []

    photo_id = best_photo_file_id(message)
    if photo_id:
        attachments.append(("photo", photo_id))

    for kind in ("document", "video", "audio", "voice", "animation", "sticker"):
        item = message.get(kind)
        if isinstance(item, dict) and item.get("file_id"):
            attachments.append((kind, item["file_id"]))

    return attachments


def normalize_message(message: dict, token: str, output_dir: pathlib.Path, download: bool) -> dict:
    chat = message.get("chat") or {}
    sender = message.get("from") or {}
    forward_origin = message.get("forward_origin") or {}

    text = message.get("text") or message.get("caption") or ""
    attachments = []
    for kind, file_id in collect_attachment_file_ids(message):
        saved_path = None
        if download:
            try:
                saved_path = download_file(token, file_id, output_dir)
            except Exception as exc:  # Keep the message even if a file fails.
                saved_path = f"DOWNLOAD_FAILED: {exc}"
        attachments.append({"kind": kind, "file_id": file_id, "saved_path": saved_path})

    return {
        "received_at": dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds"),
        "message_id": message.get("message_id"),
        "date": message.get("date"),
        "chat": {
            "id": chat.get("id"),
            "type": chat.get("type"),
            "title": chat.get("title"),
            "username": chat.get("username"),
        },
        "from": {
            "id": sender.get("id"),
            "username": sender.get("username"),
            "first_name": sender.get("first_name"),
            "last_name": sender.get("last_name"),
        },
        "forward_origin": forward_origin,
        "text": text,
        "attachments": attachments,
        "raw": message,
    }


def append_jsonl(path: pathlib.Path, item: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")


def load_offset(path: pathlib.Path) -> int | None:
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except FileNotFoundError:
        return None
    except ValueError:
        return None


def save_offset(path: pathlib.Path, offset: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(offset), encoding="utf-8")


def run() -> int:
    parser = argparse.ArgumentParser(description="Collect Telegram bot messages into a local JSONL inbox.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTBOX), help="Directory for messages.jsonl and files.")
    parser.add_argument("--no-download", action="store_true", help="Do not download Telegram attachments.")
    parser.add_argument("--once", action="store_true", help="Fetch pending updates once and exit.")
    args = parser.parse_args()

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Set TELEGRAM_BOT_TOKEN first.", file=sys.stderr)
        return 2

    output_dir = pathlib.Path(args.output_dir).expanduser().resolve()
    messages_path = output_dir / "messages.jsonl"
    offset_path = output_dir / ".offset"
    offset = load_offset(offset_path)

    me = api_request(token, "getMe")
    print(f"Listening as @{me.get('username')} -> {messages_path}", flush=True)

    while True:
        payload = {"timeout": 50, "allowed_updates": ["message"]}
        if offset is not None:
            payload["offset"] = offset

        try:
            updates = api_request(token, "getUpdates", payload)
        except urllib.error.HTTPError as exc:
            print(f"Telegram HTTP error: {exc}", file=sys.stderr, flush=True)
            time.sleep(5)
            if args.once:
                return 1
            continue
        except Exception as exc:
            print(f"Telegram polling error: {exc}", file=sys.stderr, flush=True)
            time.sleep(5)
            if args.once:
                return 1
            continue

        for update in updates:
            offset = int(update["update_id"]) + 1
            message = update.get("message")
            if not message:
                save_offset(offset_path, offset)
                continue

            item = normalize_message(message, token, output_dir, download=not args.no_download)
            append_jsonl(messages_path, item)
            preview = (item["text"] or "[attachment]").replace("\n", " ")[:120]
            print(f"saved message {item['message_id']}: {preview}", flush=True)
            save_offset(offset_path, offset)

        if args.once:
            return 0


if __name__ == "__main__":
    raise SystemExit(run())
