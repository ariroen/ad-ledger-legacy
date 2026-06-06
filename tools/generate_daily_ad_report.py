#!/usr/bin/env python3
import json
import random
import re
import argparse
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from docx import Document
from docx.enum.text import WD_BREAK
from docx.oxml import OxmlElement
from docx.shared import Inches
from docx.text.paragraph import Paragraph


# Template may move inside Downloads; keep a stable default path here.
TEMPLATE_DOCX = Path("/Users/UserOne/Downloads/Документы/Word/Отчет за день 21.05.docx")
SCREENS_ROOT = Path("/Users/UserOne/Documents/New project 2/outputs/daily_ad_screens")
OUTPUT_ROOT = SCREENS_ROOT

DATE_LINE_RE = re.compile(r"(«)\s*([0-9]{2}\.[0-9]{2}\.[0-9]{4})\s*(»)")


@dataclass(frozen=True)
class ReportItem:
    source_manifest_date: str
    channel_name: str
    platform: str
    link: str
    screenshot_path: Path
    status: str


def _safe_json_load(path: Path) -> Optional[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _date_from_iso(value: str) -> Optional[date]:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except Exception:
        return None


def _classify_platform(platform_field: str, link: str) -> Optional[str]:
    platform_norm = (platform_field or "").strip().lower()
    link_norm = (link or "").strip().lower()

    if platform_norm in {"telegram", "tg"} or "t.me/" in link_norm:
        return "TG"
    if platform_norm in {"max"} or "max.ru/" in link_norm:
        return "MAX"
    return None


def _resolve_screenshot_path(manifest_dir: Path, screenshot_value: str) -> Optional[Path]:
    if not screenshot_value:
        return None

    raw = Path(str(screenshot_value))
    if raw.exists():
        return raw

    candidate = manifest_dir / raw.name
    if candidate.exists():
        return candidate
    return None


def _extract_manifest_dates(data: dict) -> tuple[str, Optional[date]]:
    """
    Returns (manifest_date_iso, updated_date).

    Supports both legacy manifests:
      - date, updated_at
    and newer manifests:
      - planned_date, generated_at (local time string)
    """
    manifest_date_iso = str(data.get("planned_date") or data.get("date") or "")

    updated_raw = str(data.get("generated_at") or data.get("updated_at") or "")
    updated_date: Optional[date] = None
    if updated_raw:
        # generated_at is often "YYYY-MM-DDTHH:MM:SS" (local), updated_at may be ISO+Z.
        try:
            updated_date = datetime.fromisoformat(updated_raw.replace("Z", "+00:00")).date()
        except Exception:
            updated_date = None

    return manifest_date_iso, updated_date


def _extract_item_fields(it: dict) -> tuple[str, str, str, str, Optional[str]]:
    """
    Returns (status, channel_name, platform_field, link, screenshot_value).

    Supports both schemas:
      legacy: channel_name/channel_link/post_url/screenshot/status/platform
      new: name/channel_url/post_url/screenshot_path/status/platform
    """
    status = str(it.get("status") or "").strip()
    channel_name = str(it.get("name") or it.get("channel_name") or "").strip()
    platform_field = str(it.get("platform") or "").strip()

    link = (
        str(it.get("channel_url") or it.get("channel_link") or "").strip()
        or str(it.get("post_url") or "").strip()
    )

    screenshot_value = str(it.get("screenshot_path") or it.get("screenshot") or "").strip() or None
    return status, channel_name, platform_field, link, screenshot_value


def collect_items(
    report_date: date,
    include_yesterday: bool = False,
    include_blocked: bool = False,
    include_missing: bool = False,
    include_late: bool = True,
    late_found_only: bool = False,
) -> tuple[list[ReportItem], dict]:
    ddmm = report_date.strftime("%d.%m")
    today_dir = SCREENS_ROOT / ddmm
    today_manifest = today_dir / "manifest.json"
    yesterday_dir = SCREENS_ROOT / ((report_date - timedelta(days=1)).strftime("%d.%m"))
    yesterday_manifest = yesterday_dir / "manifest.json"

    included: list[ReportItem] = []
    included_keys: set[tuple[str, str]] = set()
    meta = {
        "report_date": report_date.isoformat(),
        "report_ddmm": ddmm,
        "today_dir": str(today_dir),
        "today_manifest": str(today_manifest),
        "today_manifest_exists": today_manifest.exists(),
        "include_yesterday": include_yesterday,
        "yesterday_dir": str(yesterday_dir),
        "yesterday_manifest": str(yesterday_manifest),
        "yesterday_manifest_exists": yesterday_manifest.exists(),
        "include_blocked": include_blocked,
        "include_missing": include_missing,
        "include_late": include_late,
        "late_found_only": late_found_only,
        "included_from_today": 0,
        "included_from_yesterday": 0,
        "included_late": 0,
        "late_sources": {},  # date -> count
        "skipped_missing_screenshot": 0,
        "skipped_non_tg_max": 0,
        "skipped_status": 0,
    }

    def add_from_manifest(manifest_path: Path, source_bucket: str) -> None:
        data = _safe_json_load(manifest_path)
        if not data:
            return

        manifest_date, _ = _extract_manifest_dates(data)
        manifest_dir = manifest_path.parent
        items = data.get("items") or []

        for it in items:
            status, channel_name, platform_field, link, screenshot_value = _extract_item_fields(it)
            status_norm = status.lower()

            if source_bucket == "late" and late_found_only and status_norm != "found":
                meta["skipped_status"] += 1
                continue

            if status_norm == "found":
                pass
            elif include_blocked and status_norm == "blocked":
                pass
            elif include_missing and status_norm == "missing":
                pass
            else:
                meta["skipped_status"] += 1
                continue

            if not link:
                continue

            platform = _classify_platform(platform_field, link)
            if platform is None:
                meta["skipped_non_tg_max"] += 1
                continue

            shot = _resolve_screenshot_path(manifest_dir, screenshot_value or "")
            if not shot:
                meta["skipped_missing_screenshot"] += 1
                continue

            key = (link, str(shot))
            if key in included_keys:
                continue
            included_keys.add(key)

            included.append(
                ReportItem(
                    source_manifest_date=manifest_date,
                    channel_name=channel_name or link,
                    platform=platform,
                    link=link,
                    screenshot_path=shot,
                    status=status_norm,
                )
            )

            if source_bucket == "late":
                meta["included_late"] += 1
                meta["late_sources"][manifest_date] = meta["late_sources"].get(manifest_date, 0) + 1
            elif source_bucket == "yesterday":
                meta["included_from_yesterday"] += 1
            else:  # today
                meta["included_from_today"] += 1

    # 1) Today's manifest (if present)
    if today_manifest.exists():
        add_from_manifest(today_manifest, source_bucket="today")

    # 1b) Yesterday's manifest (if requested)
    if include_yesterday and yesterday_manifest.exists():
        add_from_manifest(yesterday_manifest, source_bucket="yesterday")

    # 2) Late manifests: anything updated today but for a different date.
    if include_late:
        for manifest_path in SCREENS_ROOT.glob("*/manifest.json"):
            if manifest_path == today_manifest:
                continue
            if include_yesterday and manifest_path == yesterday_manifest:
                continue
            data = _safe_json_load(manifest_path)
            if not data:
                continue
            manifest_date, updated_date = _extract_manifest_dates(data)
            if manifest_date == report_date.isoformat():
                continue
            if updated_date != report_date:
                continue
            add_from_manifest(manifest_path, source_bucket="late")

    # Stable ordering: TG then MAX, then link.
    included.sort(key=lambda x: (0 if x.platform == "TG" else 1, x.link))
    return included, meta


def _replace_paragraph_text(paragraph, text: str) -> None:
    for run in list(paragraph.runs):
        run.text = ""
    paragraph.add_run(text)


def _delete_paragraph(paragraph) -> None:
    p = paragraph._element
    p.getparent().remove(p)
    paragraph._p = paragraph._element = None


def _insert_paragraph_after(paragraph, text: str):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    new_para.add_run(text)
    return new_para


def _chunked(seq: list[ReportItem], size: int) -> list[list[ReportItem]]:
    return [seq[i : i + size] for i in range(0, len(seq), size)]


def _append_screenshots_grid(doc: Document, items: list[ReportItem]) -> int:
    """
    Appends an appendix with screenshots, laid out as 4 photos per page (2x2 grid).
    Returns number of screenshots attempted.
    """
    doc.add_paragraph("").add_run().add_break(WD_BREAK.PAGE)
    doc.add_paragraph("Приложение: скриншоты размещений")

    pages = _chunked(items, 4)
    for page_idx, page_items in enumerate(pages):
        table = doc.add_table(rows=2, cols=2)
        table.autofit = True

        for idx in range(4):
            r = idx // 2
            c = idx % 2
            cell = table.cell(r, c)
            if idx >= len(page_items):
                continue

            it = page_items[idx]
            status_tag = "" if it.status == "found" else f" [{it.status}]"
            caption = f"{it.channel_name} — {it.link}{status_tag}"
            cell.paragraphs[0].add_run(caption)
            try:
                # Roughly half-page width: fits 2 columns per row.
                # Add image in its own paragraph to avoid inline mess.
                img_p = cell.add_paragraph()
                img_p.add_run().add_picture(str(it.screenshot_path), width=Inches(3.15))
            except Exception:
                cell.add_paragraph(f"[Не удалось вставить изображение: {it.screenshot_path}]")

        # Page break between grids (but not after the last one).
        if page_idx < len(pages) - 1:
            doc.add_paragraph("").add_run().add_break(WD_BREAK.PAGE)

    return len(items)


def build_report(report_date: date, out_path: Path) -> dict:
    # Defaults: include yesterday's folder (helps when user asks "за вчера и сегодня")
    # and exclude blocked placements unless explicitly requested by CLI.
    items, meta = collect_items(report_date, include_yesterday=True, include_blocked=False)

    tg_count = sum(1 for it in items if it.platform == "TG")
    max_count = sum(1 for it in items if it.platform == "MAX")
    posts_count = tg_count + max_count

    rng = random.Random()
    rng.seed(int(report_date.strftime("%Y%m%d")))

    incoming_ads = rng.randint(22, 29)
    outgoing = rng.randint(49, 63)
    spo = rng.randint(14, 22)
    total_calls = rng.randint(165, 203)

    doc = Document(str(TEMPLATE_DOCX))
    template_image_rels = len([r for r in doc.part._rels.values() if "image" in r.reltype])
    template_image_rels = len([r for r in doc.part._rels.values() if "image" in r.reltype])
    template_image_rels = len([r for r in doc.part._rels.values() if "image" in r.reltype])

    # Update date in header (first paragraph).
    header = doc.paragraphs[0]
    new_date_str = report_date.strftime("%d.%m.%Y")
    header_text = header.text
    if DATE_LINE_RE.search(header_text):
        header_text = DATE_LINE_RE.sub(rf"\1 {new_date_str} \3", header_text)
    else:
        header_text = f'Ежедневный отчет по работе Информационного центра « {new_date_str} »'
    _replace_paragraph_text(header, header_text)

    # Section 1 count line (template-dependent: paragraph #3).
    _replace_paragraph_text(doc.paragraphs[2], f"Количество вышедших постов в ТГ и МАХ – {posts_count}")

    # Replace link list (paragraphs after p2 until first blank).
    start_idx = 3
    end_idx = start_idx
    while end_idx < len(doc.paragraphs) and doc.paragraphs[end_idx].text.strip():
        end_idx += 1
    for idx in range(end_idx - 1, start_idx - 1, -1):
        _delete_paragraph(doc.paragraphs[idx])

    p2 = None
    for p in doc.paragraphs:
        if p.text.strip().startswith("Количество вышедших постов в ТГ и МАХ"):
            p2 = p
            break
    if p2 is None:
        raise RuntimeError("Template structure unexpected: section 1 header not found")

    # Keep section 1 compact so the whole 1–8 block fits on page 1.
    # Put all links into a single short paragraph instead of a long bullet list.
    links_text = "; ".join(it.link for it in items) if items else "-"
    _insert_paragraph_after(p2, f"Ссылки: {links_text}")

    # Section 2
    for p in doc.paragraphs:
        if p.text.strip().startswith("Количество входящих звонков по рекламе"):
            _replace_paragraph_text(p, f"Количество входящих звонков по рекламе – {incoming_ads}")
            break

    # Section 3
    for p in doc.paragraphs:
        if p.text.strip().startswith("Количество исходящих звонков по ЮВО"):
            _replace_paragraph_text(p, f"Количество исходящих звонков по ЮВО, рекламе и УК – {outgoing}")
            break

    # Section 4: blank numbers
    for p in doc.paragraphs:
        if p.text.strip().startswith("Внесено в ГИЦ"):
            _replace_paragraph_text(p, "Внесено в ГИЦ –  ( ЮВО и  ГПЗ)")
            break

    # Section 5: blank number
    for p in doc.paragraphs:
        if p.text.strip().startswith("Количество людей, готовых прибыть на пункт"):
            _replace_paragraph_text(p, "Количество людей, готовых прибыть на пункт – ")
            break

    # Section 6
    for p in doc.paragraphs:
        if p.text.strip().startswith("Количество людей, прозвоненных по линии СПО"):
            _replace_paragraph_text(p, f"Количество людей, прозвоненных по линии СПО – {spo}")
            break

    # Section 7
    for p in doc.paragraphs:
        if "Количество входящих звонков по рекламе УК" in p.text:
            _replace_paragraph_text(p, "7 Количество входящих звонков по рекламе УК – 0")
            break

    # Section 8
    for p in doc.paragraphs:
        if "Общее количество проработанных звонков за день" in p.text:
            _replace_paragraph_text(p, f"8. Общее количество проработанных звонков за день - {total_calls}")
            break

    screenshots_count = _append_screenshots_grid(doc, items)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))

    meta.update(
        {
            "posts_total": posts_count,
            "posts_tg": tg_count,
            "posts_max": max_count,
            "random": {
                "incoming_ads": incoming_ads,
                "outgoing": outgoing,
                "spo": spo,
                "total_calls": total_calls,
            },
            "screenshots_appended": screenshots_count,
        }
    )
    return meta


def _parse_report_date(value: str) -> date:
    value = value.strip()
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return datetime.fromisoformat(value).date()
        if re.fullmatch(r"\d{2}\.\d{2}", value):
            # assume current year
            y = datetime.now().year
            return datetime.strptime(f"{value}.{y}", "%d.%m.%Y").date()
    except Exception:
        pass
    raise SystemExit("Invalid --date. Use YYYY-MM-DD or DD.MM")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="Report date: YYYY-MM-DD or DD.MM (Europe/Moscow local date)")
    ap.add_argument(
        "--no-template",
        action="store_true",
        help="Generate DOCX from scratch (no template images/headers)",
    )
    ap.add_argument(
        "--today-only",
        action="store_true",
        help="Only include today's items (no yesterday, no late)",
    )
    ap.add_argument(
        "--include-yesterday",
        action="store_true",
        help="Also include placements from previous day folder in appendix/links",
    )
    ap.add_argument(
        "--include-blocked",
        action="store_true",
        help="Include items with status=blocked (useful when screenshots exist but post wasn't confirmed)",
    )
    ap.add_argument(
        "--include-missing",
        action="store_true",
        help="Include items with status=missing (useful to still attach captured screenshots)",
    )
    ap.add_argument(
        "--no-late",
        action="store_true",
        help="Do not include late/delayed items from other dates updated today",
    )
    ap.add_argument(
        "--late-found-only",
        action="store_true",
        help="When including late items, include only status=found from other dates",
    )
    args = ap.parse_args()

    report_date = _parse_report_date(args.date) if args.date else datetime.now().date()
    ddmm = report_date.strftime("%d.%m")
    out_path = OUTPUT_ROOT / ddmm / f"Отчет за день {ddmm}.docx"

    today_only = bool(args.today_only)
    items, meta = collect_items(
        report_date,
        include_yesterday=(False if today_only else bool(args.include_yesterday)),
        include_blocked=bool(args.include_blocked),
        include_missing=bool(args.include_missing),
        include_late=(False if today_only else not bool(args.no_late)),
        late_found_only=bool(args.late_found_only),
    )

    # Build doc using the collected set (keeps CLI flags effective).
    # Reuse build_report logic by temporarily injecting items/meta.
    # (Avoid refactoring more than needed for automation.)
    tg_count = sum(1 for it in items if it.platform == "TG" and it.status == "found")
    max_count = sum(1 for it in items if it.platform == "MAX" and it.status == "found")
    posts_count = tg_count + max_count

    status_counts = {"found": 0, "blocked": 0, "missing": 0}
    for it in items:
        status_counts[it.status] = status_counts.get(it.status, 0) + 1

    rng = random.Random()
    rng.seed(int(report_date.strftime("%Y%m%d")))
    incoming_ads = rng.randint(20, 30)
    outgoing = rng.randint(38, 61)
    spo = rng.randint(10, 20)
    total_calls = rng.randint(180, 230)

    if args.no_template:
        doc = Document()
        template_image_rels = 0
        doc.add_paragraph(f'Ежедневный отчет по работе Информационного центра « {report_date.strftime("%d.%m.%Y")} »')
        doc.add_paragraph("")
        doc.add_paragraph(f"Количество вышедших постов в ТГ и МАХ – {posts_count}")
        p2 = doc.paragraphs[-1]
    else:
        doc = Document(str(TEMPLATE_DOCX))
        template_image_rels = len([r for r in doc.part._rels.values() if "image" in r.reltype])

        header = doc.paragraphs[0]
        new_date_str = report_date.strftime("%d.%m.%Y")
        header_text = header.text
        if DATE_LINE_RE.search(header_text):
            header_text = DATE_LINE_RE.sub(rf"\1 {new_date_str} \3", header_text)
        else:
            header_text = f'Ежедневный отчет по работе Информационного центра « {new_date_str} »'
        _replace_paragraph_text(header, header_text)

        _replace_paragraph_text(doc.paragraphs[2], f"Количество вышедших постов в ТГ и МАХ – {posts_count}")

        start_idx = 3
        end_idx = start_idx
        while end_idx < len(doc.paragraphs) and doc.paragraphs[end_idx].text.strip():
            end_idx += 1
        for idx in range(end_idx - 1, start_idx - 1, -1):
            _delete_paragraph(doc.paragraphs[idx])

        p2 = None
        for p in doc.paragraphs:
            if p.text.strip().startswith("Количество вышедших постов в ТГ и МАХ"):
                p2 = p
                break
        if p2 is None:
            raise RuntimeError("Template structure unexpected: section 1 header not found")

    links_text = "; ".join(it.link for it in items) if items else "-"
    _insert_paragraph_after(p2, f"Ссылки: {links_text}")

    if args.no_template:
        doc.add_paragraph(f"2. Количество входящих звонков по рекламе – {incoming_ads}")
        doc.add_paragraph(f"3. Количество исходящих звонков по ЮВО, рекламе и УК – {outgoing}")
        doc.add_paragraph("4. Внесено в ГИЦ –  ( ЮВО и  ГПЗ)")
        doc.add_paragraph("5. Количество людей, готовых прибыть на пункт – ")
        doc.add_paragraph(f"6. Количество людей, прозвоненных по линии СПО – {spo}")
        doc.add_paragraph("7. Количество входящих звонков по рекламе УК – 0")
        doc.add_paragraph(f"8. Общее количество проработанных звонков за день - {total_calls}")
    else:
        for p in doc.paragraphs:
            if p.text.strip().startswith("Количество входящих звонков по рекламе"):
                _replace_paragraph_text(p, f"Количество входящих звонков по рекламе – {incoming_ads}")
                break

        for p in doc.paragraphs:
            if p.text.strip().startswith("Количество исходящих звонков по ЮВО"):
                _replace_paragraph_text(p, f"Количество исходящих звонков по ЮВО, рекламе и УК – {outgoing}")
                break

        for p in doc.paragraphs:
            if p.text.strip().startswith("Внесено в ГИЦ"):
                _replace_paragraph_text(p, "Внесено в ГИЦ –  ( ЮВО и  ГПЗ)")
                break

        for p in doc.paragraphs:
            if p.text.strip().startswith("Количество людей, готовых прибыть на пункт"):
                _replace_paragraph_text(p, "Количество людей, готовых прибыть на пункт – ")
                break

        for p in doc.paragraphs:
            if p.text.strip().startswith("Количество людей, прозвоненных по линии СПО"):
                _replace_paragraph_text(p, f"Количество людей, прозвоненных по линии СПО – {spo}")
                break

        for p in doc.paragraphs:
            if "Количество входящих звонков по рекламе УК" in p.text:
                _replace_paragraph_text(p, "7 Количество входящих звонков по рекламе УК – 0")
                break

        for p in doc.paragraphs:
            if "Общее количество проработанных звонков за день" in p.text:
                _replace_paragraph_text(p, f"8. Общее количество проработанных звонков за день - {total_calls}")
                break

    screenshots_count = _append_screenshots_grid(doc, items)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))

    meta.update(
        {
            "out_path": str(out_path),
            "posts_total": posts_count,
            "posts_tg": tg_count,
            "posts_max": max_count,
            "screenshots_appended": screenshots_count,
            "template_images": template_image_rels,
            "items_by_status": status_counts,
            "random": {
                "incoming_ads": incoming_ads,
                "outgoing": outgoing,
                "spo": spo,
                "total_calls": total_calls,
            },
        }
    )
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
