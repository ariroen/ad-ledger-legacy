export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^@/, "")
    .toLowerCase();
}

export function normalizeChannelName(value: unknown) {
  return normalizeText(value)
    .replace(/^https?:\/\/t\.me\//, "")
    .replace(/^https?:\/\/max\.ru\//, "")
    .replace(/[«»"]/g, "")
    .trim();
}

export function normalizeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const withoutQuery = raw.split("?")[0].replace(/\/+$/, "");
  if (withoutQuery.startsWith("@")) return `https://t.me/${withoutQuery.slice(1)}`;
  if (/^t\.me\//i.test(withoutQuery)) return `https://${withoutQuery}`;
  if (/^max\.ru\//i.test(withoutQuery)) return `https://${withoutQuery}`;
  return withoutQuery;
}

export function detectPlatform(value: unknown) {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("max") || raw.includes("макс")) return "MAX";
  if (raw.includes("vk") || raw.includes("вк")) return "VK";
  if (raw.includes("ok.ru") || raw.includes("однокласс")) return "OK";
  return "TG";
}

export function parseRub(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const raw = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Math.round(Number(match[0])) : null;
}

export function parseSheetDate(value: unknown, fallbackYear = 2026) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const dateTime = raw.match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!dateTime) return null;

  const day = Number(dateTime[1]);
  const month = Number(dateTime[2]) - 1;
  const yearRaw = dateTime[3] ? Number(dateTime[3]) : fallbackYear;
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const hours = dateTime[4] ? Number(dateTime[4]) : 12;
  const minutes = dateTime[5] ? Number(dateTime[5]) : 0;
  return new Date(Date.UTC(year, month, day, hours, minutes));
}

export function inferPostNumber(value: unknown) {
  const raw = String(value ?? "").toLowerCase();
  const match = raw.match(/(\d+)\s*(?:пост|выход|раз)/);
  return match?.[1] ?? null;
}
