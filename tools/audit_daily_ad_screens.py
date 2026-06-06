#!/usr/bin/env python3
import json
import re
from datetime import datetime
from pathlib import Path


PROJECT_ROOT = Path("/Users/UserOne/Documents/New project 2")
SCREENS_ROOT = PROJECT_ROOT / "outputs/daily_ad_screens"
OUT_MD = SCREENS_ROOT / "audit_daily_ad_screens.md"
OUT_JSON = SCREENS_ROOT / "audit_daily_ad_screens.json"
OUT_README = SCREENS_ROOT / "README.md"


def _safe_json_load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _count_status(items):
    counts = {"found": 0, "blocked": 0, "missing": 0}
    for it in items:
        status = str(it.get("status") or "").strip().lower()
        if status in counts:
            counts[status] += 1
    return counts


def _legacy_path_refs(text: str):
    refs = []
    for match in re.finditer(r"/Users/UserOne/Documents/New project 2/outputs/daily_ad_screens/(\d{4}-\d{2}-\d{2})/", text):
        refs.append(match.group(1))
    return sorted(set(refs))


def main() -> int:
    folders = []
    for folder in sorted(SCREENS_ROOT.iterdir()):
        if not folder.is_dir():
            continue
        if not re.fullmatch(r"\d{2}\.\d{2}", folder.name):
            continue
        folders.append(folder)

    report_rows = []
    empty_folders = []
    legacy_manifests = []
    totals = {"found": 0, "blocked": 0, "missing": 0, "folders": 0, "with_manifest": 0}

    for folder in folders:
        totals["folders"] += 1
        manifest_path = folder / "manifest.json"
        docx_files = sorted(folder.glob("Отчет за день *.docx"))
        png_files = sorted(folder.glob("*.png"))
        jpg_files = sorted(folder.glob("*.jpg"))
        other_files = sorted(
            p for p in folder.iterdir() if p.is_file() and p.name not in {".DS_Store"} and not p.name.endswith(".json")
        )

        if not manifest_path.exists():
            if not (docx_files or png_files or jpg_files or other_files):
                empty_folders.append(folder.name)
            report_rows.append(
                {
                    "folder": folder.name,
                    "manifest": False,
                    "docx": len(docx_files),
                    "png": len(png_files),
                    "jpg": len(jpg_files),
                    "items": 0,
                    "found": 0,
                    "blocked": 0,
                    "missing": 0,
                    "planned_date": None,
                    "generated_at": None,
                    "legacy_refs": [],
                }
            )
            continue

        data = _safe_json_load(manifest_path)
        if not data:
            report_rows.append(
                {
                    "folder": folder.name,
                    "manifest": True,
                    "docx": len(docx_files),
                    "png": len(png_files),
                    "jpg": len(jpg_files),
                    "items": 0,
                    "found": 0,
                    "blocked": 0,
                    "missing": 0,
                    "planned_date": None,
                    "generated_at": None,
                    "legacy_refs": [],
                }
            )
            continue

        items = data.get("items") or []
        counts = _count_status(items)
        totals["with_manifest"] += 1
        totals["found"] += counts["found"]
        totals["blocked"] += counts["blocked"]
        totals["missing"] += counts["missing"]
        legacy_refs = _legacy_path_refs(manifest_path.read_text(encoding="utf-8"))
        if legacy_refs:
            legacy_manifests.append({"folder": folder.name, "refs": legacy_refs})

        report_rows.append(
            {
                "folder": folder.name,
                "manifest": True,
                "docx": len(docx_files),
                "png": len(png_files),
                "jpg": len(jpg_files),
                "items": len(items),
                "found": counts["found"],
                "blocked": counts["blocked"],
                "missing": counts["missing"],
                "planned_date": data.get("planned_date") or data.get("date"),
                "generated_at": data.get("generated_at") or data.get("updated_at"),
                "legacy_refs": legacy_refs,
            }
        )

    lines = []
    lines.append("# Аудит ежедневной рекламы")
    lines.append("")
    lines.append(f"- Сгенерировано: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- Папок с дневными данными: {totals['folders']}")
    lines.append(f"- Папок с `manifest.json`: {totals['with_manifest']}")
    lines.append(f"- Скриншотов со статусом `found`: {totals['found']}")
    lines.append(f"- Скриншотов со статусом `blocked`: {totals['blocked']}")
    lines.append(f"- Скриншотов со статусом `missing`: {totals['missing']}")
    lines.append("")

    lines.append("## Пустые папки")
    if empty_folders:
        for name in empty_folders:
            lines.append(f"- `{name}`")
    else:
        lines.append("- нет")
    lines.append("")

    lines.append("## Папки без манифеста")
    no_manifest = [row["folder"] for row in report_rows if not row["manifest"]]
    if no_manifest:
        for name in no_manifest:
            lines.append(f"- `{name}`")
    else:
        lines.append("- нет")
    lines.append("")

    lines.append("## Дни с проблемами")
    problematic = [row for row in report_rows if row["manifest"] and (row["blocked"] or row["missing"])]
    if problematic:
        for row in problematic:
            lines.append(
                f"- `{row['folder']}`: found={row['found']}, blocked={row['blocked']}, missing={row['missing']}, "
                f"manifest_date={row['planned_date'] or 'n/a'}"
            )
    else:
        lines.append("- нет")
    lines.append("")

    lines.append("## Старые ссылки в манифестах")
    if legacy_manifests:
        for row in legacy_manifests:
            refs = ", ".join(f"`{ref}`" for ref in row["refs"])
            lines.append(f"- `{row['folder']}`: {refs}")
    else:
        lines.append("- нет")
    lines.append("")

    lines.append("## Сводка по папкам")
    for row in report_rows:
        lines.append(
            f"- `{row['folder']}`: manifest={'yes' if row['manifest'] else 'no'}, "
            f"docx={row['docx']}, png={row['png']}, jpg={row['jpg']}, "
            f"items={row['items']}, found={row['found']}, blocked={row['blocked']}, missing={row['missing']}"
        )

    readme_lines = []
    readme_lines.append("# Ежедневная реклама")
    readme_lines.append("")
    readme_lines.append("Это верхний индекс папки `outputs/daily_ad_screens`.")
    readme_lines.append("")
    readme_lines.append("## Что здесь есть")
    readme_lines.append(f"- Папок с данными: {totals['folders']}")
    readme_lines.append(f"- Папок с манифестом: {totals['with_manifest']}")
    readme_lines.append(f"- `found`: {totals['found']}")
    readme_lines.append(f"- `blocked`: {totals['blocked']}")
    readme_lines.append(f"- `missing`: {totals['missing']}")
    readme_lines.append("")
    readme_lines.append("## Быстрые ссылки")
    readme_lines.append("- [`audit_daily_ad_screens.md`](./audit_daily_ad_screens.md)")
    readme_lines.append("- [`audit_daily_ad_screens.json`](./audit_daily_ad_screens.json)")
    readme_lines.append("")
    readme_lines.append("## Дни")
    for row in report_rows:
        status = "ok" if row["manifest"] and not row["blocked"] and not row["missing"] else "needs work"
        readme_lines.append(
            f"- `{row['folder']}` — {status}; docx={row['docx']}; png={row['png']}; items={row['items']}; "
            f"found={row['found']}; blocked={row['blocked']}; missing={row['missing']}"
        )
    readme_lines.append("")
    readme_lines.append("## Что надо добить")
    if problematic or empty_folders:
        for row in problematic:
            readme_lines.append(
                f"- `{row['folder']}`: закрыть `blocked/missing` (found={row['found']}, blocked={row['blocked']}, missing={row['missing']})"
            )
        for name in empty_folders:
            readme_lines.append(f"- `{name}`: нет манифеста и файлов")
    else:
        readme_lines.append("- ничего")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    OUT_JSON.write_text(
        json.dumps(
            {
                "generated_at": datetime.now().isoformat(timespec="seconds"),
                "summary": totals,
                "empty_folders": empty_folders,
                "no_manifest_folders": no_manifest,
                "problematic_folders": problematic,
                "legacy_manifests": legacy_manifests,
                "rows": report_rows,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    OUT_README.write_text("\n".join(readme_lines) + "\n", encoding="utf-8")

    print(json.dumps({"md": str(OUT_MD), "json": str(OUT_JSON)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
