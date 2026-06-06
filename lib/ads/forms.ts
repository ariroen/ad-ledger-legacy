import { parseRub, parseSheetDate } from "./normalize";

export function formString(form: FormData, key: string) {
  const value = form.get(key);
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
}

export function formInt(form: FormData, key: string) {
  return parseRub(formString(form, key));
}

export function formDate(form: FormData, key: string) {
  return parseSheetDate(formString(form, key));
}

export function redirectBack(request: Request, fallback: string) {
  const referer = request.headers.get("referer");
  return new URL(referer || fallback, request.url);
}
