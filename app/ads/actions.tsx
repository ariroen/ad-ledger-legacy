"use client";

import { useState } from "react";
import { Download, FileDown, Loader2, RefreshCw } from "lucide-react";

export function ImportControls() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function runImport() {
    setState("loading");
    const response = await fetch("/api/ads/import", { method: "POST" });
    setState(response.ok ? "done" : "error");
    if (response.ok) window.location.href = "/ads/reports";
  }

  return (
    <div className="ads-actions">
      <button className="ads-button ads-button-primary" onClick={runImport} disabled={state === "loading"}>
        {state === "loading" ? <Loader2 size={16} className="ads-spin" /> : <RefreshCw size={16} />}
        Импорт Excel + Telegram
      </button>
      <a className="ads-button" href="/api/ads/export/excel">
        <Download size={16} />
        Excel
      </a>
      <a className="ads-button" href="/api/ads/export/pdf">
        <FileDown size={16} />
        PDF
      </a>
      {state === "error" ? <span className="ads-error">Импорт не прошёл</span> : null}
    </div>
  );
}
