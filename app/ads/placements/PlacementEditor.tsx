"use client";

import { useState } from "react";

type Manager = { id: string; name: string };

type Placement = {
  id: string;
  status: string;
  priceRub: number | null;
  plannedAt: Date | string | null;
  postUrl: string | null;
  note: string | null;
  managerId: string | null;
};

function toInputDate(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function PlacementEditor({ placement, managers }: { placement: Placement; managers: Manager[] }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setSaved(false);
    const response = await fetch(`/api/ads/placements/${placement.id}`, {
      method: "PATCH",
      body: formData,
    });
    setBusy(false);
    setSaved(response.ok);
    if (response.ok) setTimeout(() => window.location.reload(), 450);
  }

  return (
    <form className="ads-inline-form" action={submit}>
      <input name="plannedAt" defaultValue={toInputDate(placement.plannedAt)} placeholder="дд.мм.гггг чч:мм" />
      <select name="status" defaultValue={placement.status}>
        {["запланировано", "ждём выход", "вышло", "не найдено", "blocked", "перенос", "отмена", "требует проверки"].map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <input name="priceRub" defaultValue={placement.priceRub ?? ""} placeholder="цена" />
      <select name="managerId" defaultValue={placement.managerId ?? ""}>
        <option value="">без менеджера</option>
        {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
      </select>
      <input name="postUrl" defaultValue={placement.postUrl ?? ""} placeholder="ссылка поста" />
      <input name="note" defaultValue={placement.note ?? ""} placeholder="комментарий" />
      <button className="ads-button" disabled={busy} type="submit">{busy ? "..." : "Сохранить"}</button>
      {saved ? <span className="ads-ok">сохранено</span> : null}
    </form>
  );
}
