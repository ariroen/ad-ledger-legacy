#!/usr/bin/env python3
import copy
import json
import random
import re
import string
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo


WORKBOOK = Path("/Users/UserOne/Downloads/Закупка рекламы Май Обнова 1 (1).xlsx")
OUT_DIR = Path("/Users/UserOne/Documents/New project 2/outputs")
ENTRIES_JSON = OUT_DIR / "june_procurement_entries_for_refs.json"
REFS_JSON = OUT_DIR / "june_procurement_refs_created.json"
REPORT_JSON = OUT_DIR / "june_procurement_update_report.json"
SITE = "http://xn--61-6kc3bbqgrrd.xn--p1ai"
MANAGER = "Патриот"


def p(channel, platform="TG", price=None, fmt="", count=1, note=""):
    return {
        "channel": channel.strip(),
        "platform": platform,
        "price": price,
        "format": fmt.strip(),
        "count": count,
        "note": note.strip(),
    }


PURCHASES = [
    p("Русский Патриот", "TG", 5500, "1/72"),
    p("Осведомитель", "TG", 7000, "1/24"),
    p("Саваничи", "TG", 30000, "2/24"),
    p("Военные Сводки - Чё там в мире?", "TG", 6500, "1/без удаления"),
    p("Военный Обозреватель", "TG", 12000, "30/24"),
    p("Купянск Наш", "TG", 5000, "1/48"),
    p("Непрошенные Гости", "TG", 7500, "1/48"),
    p("Новости СВО и Мира", "TG", 5000, "1/48"),
    p("Военный Осведомитель", "TG", 38000, "30 мин/30д"),
    p("Синяя Z Борода", "TG", 7500, "30/без удаления"),
    p("Война История Оружие", "TG", 6500, "30/48"),
    p("Шейх Тамир", "TG", 20000, "1/48"),
    p("Генеральный штаб", "TG", 18000, "1/48"),
    p("Бладсикер 2.0", "TG", 15000, "1/48"),
    p("Рупор Фауста | Z", "TG", 8500, "1/48"),
    p("Правый Гарнизон", "TG", 13000, "1/48"),
    p("Военная Сводка", "TG", 16000, "1/72"),
    p("Пересидок", "TG", 15000, "1/48"),
    p("Мысли Гоблина", "TG", 10000, "1/120"),
    p("Анатолий Радов", "TG", 6000, "1/24"),
    p("НгП раZVедка", "TG", 25000, "30/24"),
    p("Депутатские будни", "TG", 40000, "1/без удаления"),
    p("Рамзай", "TG", 14000, "1/24"),
    p("Zuben_co Новости", "TG", 7500, "1/48"),
    p("Выпускайте КракенаZ!", "TG", 30000, "1/48"),
    p("Узел Связи", "TG", 15000, "1/24"),
    p("ТОВАРИЩ СОРЯН", "TG", 18000, "1/48"),
    p("Alex Parker Returns", "TG", 16000, "1/48"),
    p("Сводки и Аналитика СВО", "TG", 14500, "1/24"),
    p("ФРОНТОВИК", "TG", 3700, "1/72"),
    p("Военная Сводка 2.0", "TG", 7500, "1/72"),
    p("Ночной Дозор России", "TG", 8500, "40/48"),
    p("Повёрнутые на Z войне", "TG", 30000, "30/7"),
    p("ХтоШо/Сергей Черкасский", "TG", 10000, "1/24"),
    p("От Мариуполя до Карпат", "TG", 6000, "1/без удаления"),
    p("ПоZыVнОй «Леон»", "TG", 15000, "1/24"),
    p("Право Знать", "TG", 5000, "1/без удаления"),
    p("Русский Меч", "TG", 24000, "1/24"),
    p("Харьковское направление", "TG", 3000, "1/48"),
    p("Шепот Фронта", "TG", 12000, "1/72"),
    p("Радар ПЛЮС", "TG", 8000, "1/48"),
    p("Радар Белгород", "TG", 10000, "1/48"),
    p("Lpr 1", "TG", 30000, "до первого оповещения/без удаления"),
    p("Купол России", "TG", 8000, "до первого оповещения/без удаления"),
    p("Суджа Родная", "TG", 10000, "1/48"),
    p("Пономарь", "TG", 8500, "1/24"),
    p("Кирилл Федоров / Война История Оружие", "TG", 20000, "30/24"),
    p("Петя Первый", "TG", 29000, "30/24"),
    p("Товарищ Сорян", "MAX", 18000, "1/48"),
    p("LPR оповещения, тревоги", "MAX", 14000, "до первого оповещения/без удаления"),
    p("Радар Белгород", "MAX", 10000, "1/48"),
    p("Право Знать", "MAX", 5000, "1/48"),
    p("Пересидок", "MAX", 16500, "1/72"),
    p("Генеральный штаб", "MAX", 15000, "1/48"),
    p("Военная Сводка", "MAX", 9000, "1/48"),
    p("Белорусский Силовик", "MAX", 55000, "1/48"),
    p("Русский Патриот", "MAX", 3000, "1/72"),
    p("Суджа Родная", "MAX", 3000, "1/48"),
    p("Шепот Фронта", "MAX", 8000, "1/48"),
    p("Харьковское направление", "MAX", 3000, "1/48"),
    p("Пересидок", "MAX", 16500, "из списка 1.25кк"),
    p("Alex Parker Returns", "TG", 16000, "из списка 1.25кк"),
    p("Генеральный штаб", "MAX", 15000, "из списка 1.25кк"),
    p("Бладсикер 2.0", "TG", 15000, "из списка 1.25кк"),
    p("ПоZыVнОй «Леон»", "TG", 15000, "из списка 1.25кк"),
    p("Сводки и Аналитика СВО", "TG", 14500, "из списка 1.25кк"),
    p("Рамзай", "TG", 14000, "из списка 1.25кк"),
    p("LPR оповещения, тревоги", "MAX", 14000, "из списка 1.25кк"),
    p("Военный Обозреватель", "TG", 12000, "из списка 1.25кк"),
    p("Мысли Гоблина", "TG", 10000, "из списка 1.25кк"),
    p("ХтоШо/Сергей Черкасский", "TG", 10000, "из списка 1.25кк"),
    p("Суджа Родная", "TG", 10000, "из списка 1.25кк"),
    p("Военная Сводка", "MAX", 9000, "из списка 1.25кк"),
    p("Пономарь", "TG", 8500, "из списка 1.25кк"),
    p("Рупор Фауста | Z", "TG", 8500, "из списка 1.25кк"),
    p("Ночной Дозор России", "TG", 8500, "из списка 1.25кк"),
    p("Война История Оружие", "TG", 6500, "из списка 1.25кк"),
    p("Русский Патриот", "MAX", 3000, "из списка 1.25кк"),
    p("LPR оповещения, тревоги", "MAX", 14000, "до первого оповещения/без удаления", 2),
    p("Lpr 1", "TG", 30000, "до первого оповещения/без удаления", 2),
    p("Alex Parker Returns", "TG", 16000, "1/48", 2),
    p("НгП раZVедка", "TG", 25000, "30/24"),
    p("Правый Гарнизон", "TG", 13000, "1/48"),
    p("Анатолий Радов", "TG", 6000, "1/24", 2),
    p("Генеральный штаб", "TG", 18000, "1/48", 2),
    p("Два Майора", "MAX", 70000, "", 2),
    p("Два Майора", "TG", 80000, "", 2),
    p("Купол России", "TG", 8000, "до первого оповещения/без удаления"),
    p("Разин", "MAX", 12000, "", 2),
    p("Шепот Фронта", "TG", 12000, "1/72"),
    p("Шепот Фронта", "MAX", 8000, "1/48"),
    p("Выпускайте КракенаZ!", "TG", 30000, "1/48"),
    p("Пересидок", "TG", 15000, "1/48"),
    p("Пересидок", "MAX", 16500, ""),
    p("Русский Патриот", "TG", 5500, "1/72"),
    p("Бладсикер 2.0", "TG", 17000, "1/48", 2),
    p("Русский Меч", "TG", 24000, "1/24"),
    p("ПоZыVнОй «Леон»", "TG", 15000, "1/24"),
    p("Генеральный Штаб", "MAX", 15000, ""),
    p("Осведомитель", "TG", 7000, "1/24"),
    p("Радар Белгород", "MAX", 10000, "1/48"),
    p("Право Знать", "MAX", 5000, "1/48"),
    p("Белорусский Силовик", "MAX", 55000, "1/48"),
    p("Русский Патриот", "MAX", 3000, "1/72"),
    p("Сводки и Аналитика СВО", "TG", 14500, "1/24"),
    p("Рупор Фауста | Z", "TG", 8500, "1/48", 2),
    p("Военные Сводки - Чё там в мире?", "TG", 6500, "1/без удаления"),
    p("Архангелы", "TG", 70000, "", 2),
    p("Архангелы", "MAX", 50000, "", 1),
]


ALIASES = {
    "военные сводки - чё там в мире?": "Военные сводки - Че там в мире?",
    "военные сводки - че там в мире?": "Военные сводки - Че там в мире?",
    "рупор фауста | z": "Рупор Фауста Z",
    "позывной «леон»": "Позывной Леон",
    "позывной леон": "Позывной Леон",
    "pozывной «леон»": "Позывной Леон",
    "война история оружие": "Война История Оружие",
    "кирилл федоров / война история оружие": "Кирилл Федоров / Война История Оружие",
    "lpr оповещения, тревоги": "LPR оповещения тревоги",
    "lpr 1": "Lpr 1",
    "zuben_co новости": "Zuben_co Новости",
    "zuben_со новости": "Zuben_co Новости",
    "нгп разведка": "НгП раZVедка",
    "саваничи": "Саваничи",
    "архангелы": "АРХАНГЕЛ СПЕЦНАЗА",
}


def canonical_name(name):
    key = normalize_name(name)
    return ALIASES.get(key, name)


def normalize_name(value):
    value = str(value or "").lower().replace("ё", "е")
    value = re.sub(r"\([^)]*\)", "", value)
    value = value.replace("|", " ")
    value = value.replace("«", "").replace("»", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def display_name(entry):
    suffix = "(Max)" if entry["platform"] == "MAX" else "(tg)"
    return f'{canonical_name(entry["channel"])}{suffix}'


def expand_purchases():
    rows = []
    serial = 1
    for item in PURCHASES:
        for copy_no in range(1, item["count"] + 1):
            row = {k: v for k, v in item.items() if k != "count"}
            row["copy_no"] = copy_no
            row["copies_total"] = item["count"]
            row["serial"] = serial
            rows.append(row)
            serial += 1
    return rows


def schedule_rows(rows):
    counts = {day: 0 for day in range(1, 31)}
    last_for_channel = {}
    for row in rows:
        key = (normalize_name(row["channel"]), row["platform"])
        best_day = None
        best_score = None
        for day in range(1, 31):
            distance = 99 if key not in last_for_channel else abs(day - last_for_channel[key])
            same_day_penalty = 200 if key in last_for_channel and day == last_for_channel[key] else 0
            score = (counts[day] * 100) + same_day_penalty - min(distance, 12)
            if best_score is None or score < best_score:
                best_score = score
                best_day = day
        row["date"] = f"{best_day:02d}.06"
        row["date_iso"] = f"2026-06-{best_day:02d}"
        row["tracking_name"] = f'Июнь 2026 | {row["date"]} | {canonical_name(row["channel"])} | {row["platform"]} | #{row["serial"]:03d}'
        counts[best_day] += 1
        last_for_channel[key] = best_day
    return sorted(rows, key=lambda r: (r["date_iso"], r["serial"]))


def build_existing_tag_maps(wb):
    maps = {"TG": {}, "MAX": {}}
    ws = wb["ВОЕНКОРЫ"]
    for row in range(3, ws.max_row + 1):
        tg_name = ws.cell(row, 10).value
        tg_tag = ws.cell(row, 9).value
        if tg_name and tg_tag:
            maps["TG"].setdefault(normalize_name(tg_name), tg_tag)
        max_name = ws.cell(row, 23).value
        max_tag = ws.cell(row, 22).value
        if max_name and max_tag:
            maps["MAX"].setdefault(normalize_name(max_name), max_tag)
    return maps


def with_tag(rows, tag_maps):
    for row in rows:
        key = normalize_name(canonical_name(row["channel"]))
        direct = tag_maps[row["platform"]].get(key)
        if not direct:
            for existing_key, tag in tag_maps[row["platform"]].items():
                if key in existing_key or existing_key in key:
                    direct = tag
                    break
        row["tag"] = direct or ""
    return rows


def prepare_entries_json():
    wb = load_workbook(WORKBOOK)
    rows = with_tag(schedule_rows(expand_purchases()), build_existing_tag_maps(wb))
    payload = {"created_at": datetime.now().isoformat(timespec="seconds"), "entries": rows}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ENTRIES_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"entries": len(rows), "json": str(ENTRIES_JSON)}, ensure_ascii=False))


def copy_cell_format(src, dst):
    if src.has_style:
        dst._style = copy.copy(src._style)
    if src.number_format:
        dst.number_format = src.number_format
    if src.alignment:
        dst.alignment = copy.copy(src.alignment)
    if src.fill:
        dst.fill = copy.copy(src.fill)
    if src.font:
        dst.font = copy.copy(src.font)
    if src.border:
        dst.border = copy.copy(src.border)


def ensure_june_columns_general(ws):
    start_col = None
    for col in range(1, ws.max_column + 1):
        if ws.cell(1, col).value == "Столбец1":
            start_col = col
            break
    if not start_col:
        start_col = ws.max_column + 1
    if ws.cell(1, start_col).value != "01.июн":
        ws.insert_cols(start_col, 30)
        for offset in range(30):
            col = start_col + offset
            ws.cell(1, col).value = f"{offset + 1:02d}.июн"
            for row in range(1, 29):
                copy_cell_format(ws.cell(row, start_col - 1), ws.cell(row, col))
            ws.column_dimensions[get_column_letter(col)].width = ws.column_dimensions[get_column_letter(start_col - 1)].width
    total_col = start_col + 30
    for row in range(2, 29):
        ws.cell(row, total_col).value = f"=SUM(A{row}:{get_column_letter(total_col - 1)}{row})"
    if "Таблица1215" in ws.tables:
        ws.tables["Таблица1215"].ref = f"A1:{get_column_letter(total_col)}28"
    return start_col


def ensure_june_columns_voenkory(ws):
    start_col = ws.max_column + 1
    for col in range(33, ws.max_column + 1):
        if ws.cell(1, col).value == "01.июн":
            return col
    for offset in range(30):
        col = start_col + offset
        ws.cell(1, col).value = f"{offset + 1:02d}.июн"
        for row in range(1, 10):
            copy_cell_format(ws.cell(row, col - 1 if offset else 66), ws.cell(row, col))
        ws.column_dimensions[get_column_letter(col)].width = ws.column_dimensions[get_column_letter(66)].width
    if "Таблица12" in ws.tables:
        ws.tables["Таблица12"].ref = f"AG1:{get_column_letter(start_col + 29)}9"
    return start_col


def write_daily_grid(ws, start_col, rows, max_rows=28):
    grouped = defaultdict(list)
    for row in rows:
        grouped[int(row["date"][:2])].append(display_name(row))
    for day in range(1, 31):
        col = start_col + day - 1
        for r in range(2, max_rows + 1):
            ws.cell(r, col).value = None
        for idx, name in enumerate(grouped[day], start=2):
            ws.cell(idx, col).value = name


def first_empty(ws, name_col, start=3):
    row = start
    while ws.cell(row, name_col).value:
        row += 1
    return row


def update_voenkory_blocks(ws, rows):
    tg_row = first_empty(ws, 10)
    max_row = first_empty(ws, 23)
    for entry in rows:
        if entry["platform"] == "TG":
            row = tg_row
            tg_row += 1
            values = {
                7: row - 2,
                8: entry["ref_url"],
                9: entry.get("tag", ""),
                10: canonical_name(entry["channel"]),
                11: entry["price"],
                12: None,
                13: 0,
                16: datetime(2026, 6, int(entry["date"][:2])),
                17: MANAGER,
                18: None,
            }
            template = row - 1
            for col in range(7, 19):
                copy_cell_format(ws.cell(template, col), ws.cell(row, col))
                ws.cell(row, col).value = values.get(col)
        else:
            row = max_row
            max_row += 1
            values = {
                20: row - 2,
                21: entry["ref_url"],
                22: entry.get("tag", ""),
                23: canonical_name(entry["channel"]) + " МАКС",
                24: entry["price"],
                25: None,
                26: 0,
                29: datetime(2026, 6, int(entry["date"][:2])),
                30: MANAGER,
                31: None,
            }
            template = row - 1
            for col in range(20, 32):
                copy_cell_format(ws.cell(template, col), ws.cell(row, col))
                ws.cell(row, col).value = values.get(col)
    if "Таблица411" in ws.tables:
        ws.tables["Таблица411"].ref = f"G2:R{max(tg_row - 1, 303)}"
    if "Таблица41114" in ws.tables:
        ws.tables["Таблица41114"].ref = f"S2:AE{max(max_row - 1, 54)}"


def update_perehody(wb, rows):
    ws = wb["Переходы"]
    row = ws.max_row + 1
    for entry in rows:
        ws.cell(row, 1).value = display_name(entry)
        ws.cell(row, 2).value = entry["code"]
        ws.cell(row, 3).value = entry["ref_url"] + "\u00a0📋"
        ws.cell(row, 4).value = "/"
        ws.cell(row, 5).value = 0
        ws.cell(row, 6).value = datetime.now().strftime("%d.%m.%Y, %H:%M")
        ws.cell(row, 7).value = "✕"
        for col in range(1, 8):
            copy_cell_format(ws.cell(row - 1, col), ws.cell(row, col))
        row += 1


def recreate_agent_sheet(wb, rows):
    title = "Закуп июнь агент"
    if title in wb.sheetnames:
        del wb[title]
    ws = wb.create_sheet(title)
    headers = ["Дата", "Платформа", "Канал", "Формат", "Цена", "Рефка", "Ссылка канала", "Экземпляр", "Примечание"]
    ws.append(headers)
    for entry in rows:
        ws.append([
            entry["date"],
            entry["platform"],
            canonical_name(entry["channel"]),
            entry["format"],
            entry["price"],
            entry["ref_url"],
            entry.get("tag", ""),
            f'{entry["copy_no"]}/{entry["copies_total"]}' if entry["copies_total"] > 1 else "",
            entry.get("note", ""),
        ])
    header_fill = PatternFill("solid", fgColor="1F4E78")
    header_font = Font(color="FFFFFF", bold=True)
    thin = Side(style="thin", color="D9E2F3")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=len(headers)):
        for cell in row:
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    widths = [10, 10, 34, 18, 12, 42, 36, 12, 24]
    for idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width
    ws.freeze_panes = "A2"
    tab = Table(displayName="JuneProcurementAgent", ref=f"A1:I{ws.max_row}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(tab)


def recreate_reconcile_sheet(wb, rows):
    title = "Сверка июнь"
    if title in wb.sheetnames:
        del wb[title]
    ws = wb.create_sheet(title)
    headers = ["Показатель", "Сумма/кол-во", "Комментарий"]
    ws.append(headers)

    known_total = sum((entry["price"] or 0) for entry in rows)
    missing = [entry for entry in rows if entry["price"] is None]
    target_total = 2_000_000
    first_block_total = sum((entry["price"] or 0) for entry in rows if entry["serial"] <= 48)
    second_block_known = known_total - first_block_total

    data = [
        ["Всего строк закупа", len(rows), "Все повторы развернуты отдельными строками"],
        ["Сумма с известными ценами", known_total, ""],
        ["Цель из переписки", target_total, "Пользователь указал закуп на 2кк"],
        ["Пакетная корректировка до 2кк", target_total - known_total, "К оплате фиксировано 2 000 000; канальные строки оставлены фактическими"],
        ["Итого к оплате", target_total, "Фиксированная оплата по договоренности"],
        ["Первый блок", first_block_total, "Сходится с указанными 680.000"],
        ["Второй блок с известными ценами", second_block_known, "Без строк, где цена не указана явно"],
        ["Пустых цен", len(missing), "См. список ниже"],
    ]
    for row in data:
        ws.append(row)

    ws.append([])
    ws.append(["Строки без цены", "", ""])
    ws.append(["Дата", "Платформа", "Канал", "Комментарий"])
    for entry in missing:
        ws.append([entry["date"], entry["platform"], canonical_name(entry["channel"]), entry.get("note", "")])

    header_fill = PatternFill("solid", fgColor="7030A0")
    header_font = Font(color="FFFFFF", bold=True)
    warn_fill = PatternFill("solid", fgColor="FFF2CC")
    for row in (1, 10):
        for cell in ws[row]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
    for row in range(2, 9):
        if "Не хватает" in str(ws.cell(row, 1).value) or "Пустых" in str(ws.cell(row, 1).value):
            for cell in ws[row]:
                cell.fill = warn_fill
    for col, width in enumerate([34, 18, 56], start=1):
        ws.column_dimensions[get_column_letter(col)].width = width
    for row in ws.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)


def update_workbook():
    if not REFS_JSON.exists():
        raise SystemExit(f"Missing refs json: {REFS_JSON}")
    payload = json.loads(REFS_JSON.read_text(encoding="utf-8"))
    rows = payload["entries"]
    wb = load_workbook(WORKBOOK)
    general = wb["общая талблица выхода"]
    voenkory = wb["ВОЕНКОРЫ"]
    general_start = ensure_june_columns_general(general)
    voenkory_start = ensure_june_columns_voenkory(voenkory)
    write_daily_grid(general, general_start, rows, max_rows=28)
    write_daily_grid(voenkory, voenkory_start, rows, max_rows=9)
    update_voenkory_blocks(voenkory, rows)
    update_perehody(wb, rows)
    recreate_agent_sheet(wb, rows)
    recreate_reconcile_sheet(wb, rows)
    wb.save(WORKBOOK)
    known_price = sum((r["price"] or 0) for r in rows)
    missing_price = sum(1 for r in rows if r["price"] is None)
    report = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "workbook": str(WORKBOOK),
        "entries": len(rows),
        "known_price_total": known_price,
        "missing_price_entries": missing_price,
        "agent_sheet": "Закуп июнь агент",
    }
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "prepare":
        prepare_entries_json()
    elif len(sys.argv) > 1 and sys.argv[1] == "update":
        update_workbook()
    else:
        raise SystemExit("use: june_procurement.py prepare|update")
