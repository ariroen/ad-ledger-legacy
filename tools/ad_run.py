#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import xml.etree.ElementTree as ET


NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
EXCEL_EPOCH_1900 = dt.date(1899, 12, 30)


RU_MONTH_ABBR = {
    1: "янв",
    2: "фев",
    3: "мар",
    4: "апр",
    5: "май",
    6: "июн",
    7: "июл",
    8: "авг",
    9: "сен",
    10: "окт",
    11: "ноя",
    12: "дек",
}


STATUS_TO_RGB = {
    "found": "FF92D050",  # green
    "delayed": "FFFFFF00",  # yellow
    "missing": "FFFF6666",  # red-ish
    "blocked": "FFB0C4DE",  # light steel blue
}


def excel_serial(d: dt.date) -> int:
    return (d - EXCEL_EPOCH_1900).days


def today_label_ru(d: dt.date) -> str:
    return f"{d.day:02d}.{RU_MONTH_ABBR[d.month]}"


def normalize_name(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\([^)]*\)", "", s)  # remove (tg) etc
    s = s.replace("«", '"').replace("»", '"')
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def extract_go_code(url: str) -> Optional[str]:
    m = re.search(r"/go/([A-Za-z0-9_-]+)", url or "")
    return m.group(1) if m else None


def cell_text(c: ET.Element) -> Optional[str]:
    t = c.attrib.get("t")
    if t == "inlineStr":
        texts = [(t_el.text or "") for t_el in c.findall(".//m:is//m:t", NS)]
        return "".join(texts)
    v = c.find("m:v", NS)
    if v is None or v.text is None:
        return None
    return v.text


def iter_cells(sheet_xml_bytes: bytes, *, cols: Optional[Iterable[str]] = None, max_rows: Optional[int] = None):
    root = ET.fromstring(sheet_xml_bytes)
    wanted_cols = set(cols) if cols else None
    for c in root.findall(".//m:sheetData/m:row/m:c", NS):
        ref = c.attrib.get("r")
        if not ref:
            continue
        m = re.match(r"([A-Z]+)(\d+)$", ref)
        if not m:
            continue
        col, row = m.group(1), int(m.group(2))
        if max_rows is not None and row > max_rows:
            continue
        if wanted_cols is not None and col not in wanted_cols:
            continue
        yield col, row, c, cell_text(c)


def find_col_by_header(sheet_xml_bytes: bytes, header_row: int, header_value: str) -> Optional[str]:
    for col, row, _c, val in iter_cells(sheet_xml_bytes, max_rows=header_row):
        if row != header_row:
            continue
        if (val or "").strip() == header_value:
            return col
    return None


def col_to_num(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n


def num_to_col(n: int) -> str:
    s = ""
    while n:
        n, rem = divmod(n - 1, 26)
        s = chr(65 + rem) + s
    return s


def load_workbook_sheet_map(z: zipfile.ZipFile) -> Dict[str, str]:
    wb_xml = ET.fromstring(z.read("xl/workbook.xml"))
    rels_xml = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {
        rel.attrib["Id"]: rel.attrib["Target"].lstrip("/")
        for rel in rels_xml.findall("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
    }
    out: Dict[str, str] = {}
    for sh in wb_xml.findall("m:sheets/m:sheet", NS):
        name = sh.attrib.get("name")
        rid = sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        if name and rid and rid in relmap:
            out[name] = relmap[rid]
    return out


def add_fill_and_xf(styles_xml_bytes: bytes, rgb: str) -> Tuple[bytes, int]:
    root = ET.fromstring(styles_xml_bytes)
    fills = root.find("m:fills", NS)
    cell_xfs = root.find("m:cellXfs", NS)
    if fills is None or cell_xfs is None:
        raise RuntimeError("Invalid styles.xml structure")

    fills_list = list(fills)
    new_fill_id = len(fills_list)
    fill_el = ET.Element(f"{{{NS['m']}}}fill")
    pattern = ET.SubElement(fill_el, f"{{{NS['m']}}}patternFill", {"patternType": "solid"})
    ET.SubElement(pattern, f"{{{NS['m']}}}fgColor", {"rgb": rgb})
    ET.SubElement(pattern, f"{{{NS['m']}}}bgColor", {"indexed": "64"})
    fills.append(fill_el)
    fills.attrib["count"] = str(len(fills_list) + 1)

    xfs_list = list(cell_xfs)
    new_xf_id = len(xfs_list)
    base = xfs_list[0].attrib.copy() if xfs_list else {"numFmtId": "0", "fontId": "0", "borderId": "0", "xfId": "0"}
    base["fillId"] = str(new_fill_id)
    base["applyFill"] = "1"
    xf_el = ET.Element(f"{{{NS['m']}}}xf", base)
    cell_xfs.append(xf_el)
    cell_xfs.attrib["count"] = str(len(xfs_list) + 1)

    return ET.tostring(root, encoding="utf-8", xml_declaration=True), new_xf_id


def ensure_status_xfs(styles_xml_bytes: bytes) -> Tuple[bytes, Dict[str, int]]:
    out_styles = styles_xml_bytes
    xfs: Dict[str, int] = {}
    for status, rgb in STATUS_TO_RGB.items():
        out_styles, xf_id = add_fill_and_xf(out_styles, rgb=rgb)
        xfs[status] = xf_id
    return out_styles, xfs


def set_cell_style_and_text(
    sheet_xml_bytes: bytes,
    *,
    updates: Dict[str, Dict[str, Optional[str]]],
    xf_id: int,
) -> bytes:
    root = ET.fromstring(sheet_xml_bytes)
    for c in root.findall(".//m:sheetData/m:row/m:c", NS):
        ref = c.attrib.get("r")
        if not ref or ref not in updates:
            continue
        c.attrib["s"] = str(xf_id)
        repl = updates[ref]
        if "text" in repl and repl["text"] is not None:
            # force inline string
            for child in list(c):
                c.remove(child)
            c.attrib["t"] = "inlineStr"
            is_el = ET.SubElement(c, f"{{{NS['m']}}}is")
            t_el = ET.SubElement(is_el, f"{{{NS['m']}}}t")
            t_el.text = repl["text"]
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def set_cell_numeric(sheet_xml_bytes: bytes, ref: str, value: int) -> bytes:
    root = ET.fromstring(sheet_xml_bytes)
    found = False
    for c in root.findall(".//m:sheetData/m:row/m:c", NS):
        if c.attrib.get("r") != ref:
            continue
        for child in list(c):
            c.remove(child)
        if "t" in c.attrib:
            del c.attrib["t"]
        v = ET.SubElement(c, f"{{{NS['m']}}}v")
        v.text = str(int(value))
        found = True
        break
    if not found:
        # create cell if missing
        m = re.match(r"([A-Z]+)(\d+)$", ref)
        if not m:
            return sheet_xml_bytes
        col, row = m.group(1), int(m.group(2))
        sheetData = root.find(".//m:sheetData", NS)
        if sheetData is None:
            return sheet_xml_bytes
        row_el = sheetData.find(f"m:row[@r='{row}']", NS)
        if row_el is None:
            row_el = ET.SubElement(sheetData, f"{{{NS['m']}}}row", {"r": str(row)})
        c_el = ET.SubElement(row_el, f"{{{NS['m']}}}c", {"r": ref})
        v = ET.SubElement(c_el, f"{{{NS['m']}}}v")
        v.text = str(int(value))
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def http_get_json(url: str, headers: Dict[str, str], params: Optional[Dict[str, str]] = None) -> dict:
    import urllib.parse
    import urllib.request

    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8"))


@dataclass
class ItemResult:
    date: dt.date
    platform: str
    name: str
    channel_url: str
    ref_url: str
    code: str
    sheet_row: int
    transitions_cell: str
    result_cell: str
    transitions_value: Optional[int]
    status: str
    reason: str
    post_url: Optional[str]
    screenshot_path: str
    api_summary: Optional[dict]
    api_tracking_link: Optional[dict]


def run_tg_screenshot(channel_url: str, code: str, out_png: str) -> dict:
    js = os.path.join(os.path.dirname(__file__), "tg_screenshot.js")
    proc = subprocess.run(
        ["node", js, channel_url, code, out_png],
        check=False,
        capture_output=True,
        text=True,
    )
    stdout = (proc.stdout or "").strip()
    # script prints JSON only; if it printed logs, take last json-like line
    last = None
    for line in stdout.splitlines()[::-1]:
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            last = line
            break
    if not last:
        # Fallback to Python Playwright implementation when node env lacks deps (e.g., playwright module).
        py = os.path.join(os.path.dirname(__file__), "tg_screenshot_py.py")
        proc2 = subprocess.run(
            ["python3", py, channel_url, code, out_png],
            check=False,
            capture_output=True,
            text=True,
        )
        stdout2 = (proc2.stdout or "").strip()
        last2 = None
        for line in stdout2.splitlines()[::-1]:
            line = line.strip()
            if line.startswith("{") and line.endswith("}"):
                last2 = line
                break
        if last2:
            try:
                return json.loads(last2)
            except Exception:
                return {"ok": False, "status": "blocked", "reason": "tg_screenshot_py_bad_json", "raw": last2, "stderr": proc2.stderr}
        return {
            "ok": False,
            "status": "blocked",
            "reason": f"tg_screenshot_no_json exit={proc.returncode}; py_exit={proc2.returncode}",
            "stderr": (proc.stderr or "") + "\n" + (proc2.stderr or ""),
        }
    try:
        return json.loads(last)
    except Exception:
        return {"ok": False, "status": "blocked", "reason": "tg_screenshot_bad_json", "raw": last, "stderr": proc.stderr}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--out-root", required=True)
    ap.add_argument("--date", action="append", required=True, help="YYYY-MM-DD (Europe/Moscow local date)")
    ap.add_argument("--base", default="https://xn--61-6kc3bbqgrrd.xn--p1ai")
    ap.add_argument("--token", default="e9dbb69734c244d8b5db320e8bb5b749890b394521a9de7e204c07948be403fe")
    args = ap.parse_args()

    dates = [dt.date.fromisoformat(d) for d in args.date]
    out_root = args.out_root
    os.makedirs(out_root, exist_ok=True)

    headers = {"Authorization": f"Bearer {args.token}"}

    with zipfile.ZipFile(args.xlsx) as z:
        smap = load_workbook_sheet_map(z)
        sheet2_name = "общая талблица выхода"
        sheet5_name = "ВОЕНКОРЫ"
        if sheet2_name not in smap or sheet5_name not in smap:
            raise RuntimeError("Required sheets not found")

        sheet2_path = smap[sheet2_name]
        sheet5_path = smap[sheet5_name]
        sheet2_xml = z.read(sheet2_path)
        sheet5_xml = z.read(sheet5_path)
        styles_xml = z.read("xl/styles.xml")

        styles_xml2, status_xfs = ensure_status_xfs(styles_xml)

        # Fetch tracking-links once for mapping code->visits.
        # This API may return 403 (token expired / access blocked). Report generation should still proceed.
        code_to_tracking = {}
        try:
            tracking_links = http_get_json(
                f"{args.base}/api/integrations/analytics/tracking-links",
                headers=headers,
            )
            for item in tracking_links.get("data") or []:
                c = item.get("code")
                if c:
                    code_to_tracking[str(c)] = item
        except Exception:
            code_to_tracking = {}

        all_results: Dict[str, List[ItemResult]] = {}
        updated_sheet2_xml = sheet2_xml
        updated_sheet5_xml = sheet5_xml

        for day in dates:
            day_label = today_label_ru(day)
            day_serial = excel_serial(day)
            out_dir = os.path.join(out_root, day.strftime("%d.%m"))
            os.makedirs(out_dir, exist_ok=True)

            day_col = find_col_by_header(updated_sheet2_xml, 1, day_label)
            if not day_col:
                raise RuntimeError(f'Could not find day header "{day_label}" in sheet2')

            planned = []
            for col, row, _c, val in iter_cells(updated_sheet2_xml, cols=[day_col], max_rows=500):
                if row <= 1:
                    continue
                if val is None:
                    continue
                s = str(val).strip()
                if s:
                    planned.append((row, s))

            planned_norm = {normalize_name(v) for _r, v in planned}

            # Load VOENKORЫ TG block rows for this day: columns H,I,J,M,P,R
            rows: Dict[int, Dict[str, str]] = {}
            for col, row, _c, val in iter_cells(updated_sheet5_xml, cols=["H", "I", "J", "M", "P", "R"], max_rows=800):
                if val is None:
                    continue
                rows.setdefault(row, {})[col] = str(val)

            day_items: List[ItemResult] = []
            for r, data in sorted(rows.items()):
                if str(data.get("P") or "") != str(day_serial):
                    continue
                name = (data.get("J") or "").strip()
                if not name:
                    continue
                if normalize_name(name) not in planned_norm:
                    continue
                ref_url = (data.get("H") or "").strip()
                channel_url = (data.get("I") or "").strip()
                code = extract_go_code(ref_url) or ""
                if not code:
                    continue

                api_summary = None
                transitions_val = None
                reason = ""
                try:
                    api_summary = http_get_json(f"{args.base}/api/integrations/analytics/summary", headers=headers, params={"code": code})
                    counts = (api_summary.get("counts") or {})
                    transitions_val = int(counts.get("tracked_visits")) if counts.get("tracked_visits") is not None else int(counts.get("total"))
                except Exception as e:
                    reason = f"api_error:{e}"

                tracking = code_to_tracking.get(code)

                png_name = f"telegram_{re.sub(r'[^0-9A-Za-zА-Яа-я._-]+', '_', name).strip('_')}_{day.isoformat()}.png"
                png_path = os.path.join(out_dir, png_name)

                tg = run_tg_screenshot(channel_url, code, png_path)
                status = tg.get("status") or "blocked"
                post_url = tg.get("postUrl")
                if status == "found":
                    reason = "post_found_public"
                elif status == "missing":
                    reason = tg.get("reason") or "post_not_found"
                else:
                    reason = tg.get("reason") or reason or "blocked"

                # Update transitions cell
                if transitions_val is not None:
                    updated_sheet5_xml = set_cell_numeric(updated_sheet5_xml, f"M{r}", transitions_val)

                # Update result cell text + color
                result_text = {"found": "Вышел", "missing": "Не найден", "blocked": "blocked", "delayed": "Проверить утром"}.get(status, status)
                updated_sheet5_xml = set_cell_style_and_text(
                    updated_sheet5_xml,
                    updates={f"R{r}": {"text": result_text}},
                    xf_id=status_xfs.get(status, status_xfs["blocked"]),
                )

                # Color the planned cells in sheet2 for this day (all planned rows)
                day_updates = {f"{day_col}{row}": {} for row, _v in planned}
                updated_sheet2_xml = set_cell_style_and_text(
                    updated_sheet2_xml,
                    updates=day_updates,
                    xf_id=status_xfs.get(status, status_xfs["blocked"]),
                )

                day_items.append(
                    ItemResult(
                        date=day,
                        platform="Telegram",
                        name=name,
                        channel_url=channel_url,
                        ref_url=ref_url,
                        code=code,
                        sheet_row=r,
                        transitions_cell=f"M{r}",
                        result_cell=f"R{r}",
                        transitions_value=transitions_val,
                        status=status,
                        reason=reason,
                        post_url=post_url,
                        screenshot_path=png_path,
                        api_summary=api_summary,
                        api_tracking_link=tracking,
                    )
                )

            # Write per-day manifest
            manifest = {
                "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
                "timezone": "Europe/Moscow",
                "planned_date": day.isoformat(),
                "planned_date_label": day_label,
                "source_xlsx": args.xlsx,
                "planned_cells": [{"row": r, "value": v} for r, v in planned],
                "items": [
                    {
                        "date": it.date.isoformat(),
                        "name": it.name,
                        "platform": it.platform,
                        "ref_code": it.code,
                        "channel_url": it.channel_url,
                        "ref_url": it.ref_url,
                        "post_url": it.post_url,
                        "screenshot_path": it.screenshot_path,
                        "transitions": it.transitions_value,
                        "status": it.status,
                        "reason": it.reason,
                        "api_summary": it.api_summary,
                        "api_tracking_link": it.api_tracking_link,
                        "sheet": sheet5_name,
                        "sheet_row": it.sheet_row,
                    }
                    for it in day_items
                ],
                "summary": {
                    "total_planned_cells": len(planned),
                    "matched_detail_rows": len(day_items),
                    "found": sum(1 for it in day_items if it.status == "found"),
                    "delayed": sum(1 for it in day_items if it.status == "delayed"),
                    "missing": sum(1 for it in day_items if it.status == "missing"),
                    "blocked": sum(1 for it in day_items if it.status == "blocked"),
                },
            }
            with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

            all_results[day.strftime("%d.%m")] = day_items

        # Write updated XLSX copy per run (weekend combined)
        weekend_tag = f"{dates[0].isoformat()}_{dates[-1].isoformat()}" if len(dates) > 1 else dates[0].isoformat()
        updated_xlsx = os.path.join(out_root, f"{os.path.splitext(os.path.basename(args.xlsx))[0]}_updated_{weekend_tag}.xlsx")
        with zipfile.ZipFile(args.xlsx) as zin, zipfile.ZipFile(updated_xlsx, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "xl/styles.xml":
                    data = styles_xml2
                elif item.filename == sheet2_path:
                    data = updated_sheet2_xml
                elif item.filename == sheet5_path:
                    data = updated_sheet5_xml
                zout.writestr(item, data)

    # Print a machine-readable summary for the caller
    summary = {
        "updated_xlsx": updated_xlsx,
        "days": {
            day: [
                {
                    "name": it.name,
                    "code": it.code,
                    "status": it.status,
                    "transitions": it.transitions_value,
                    "post_url": it.post_url,
                    "screenshot": it.screenshot_path,
                }
                for it in items
            ]
            for day, items in all_results.items()
        },
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
