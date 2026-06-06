export const DEFAULT_WORKBOOK_PATH =
  process.env.ADS_SOURCE_WORKBOOK ??
  "/Users/UserOne/Documents/New project 2/outputs/daily_ad_screens/Закупка рекламы Май Обнова 1 (1)_updated_2026-06-02_2026-06-04.xlsx";

export const DEFAULT_TELEGRAM_JSONL =
  process.env.ADS_TELEGRAM_JSONL ??
  "/Users/UserOne/Documents/New project 2/outputs/telegram_inbox/messages.jsonl";

export const PLACEMENT_STATUSES = [
  "запланировано",
  "ждём выход",
  "вышло",
  "не найдено",
  "blocked",
  "перенос",
  "отмена",
  "требует проверки",
] as const;

export const FINANCE_STATUSES = [
  "ожидаем счёт",
  "счёт получен",
  "оплачен",
  "частично оплачен",
  "закрыт",
  "требует проверки",
] as const;
