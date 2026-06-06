export function rub(value: number | null | undefined) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

export function dateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function dateOnly(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}
