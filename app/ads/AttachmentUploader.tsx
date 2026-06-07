"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ATTACHMENT_ACCEPT } from "@/lib/ads/attachment-config";

type AttachmentUploaderProps = {
  campaignId?: string | null;
  placementId?: string | null;
};

type SelectedFile = {
  file: File;
  source: "upload" | "drag-drop" | "clipboard";
  previewUrl: string | null;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 Б";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

function buildSelectedFiles(files: File[], source: SelectedFile["source"]) {
  return files.map((file) => ({
    file,
    source,
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
  }));
}

export function AttachmentUploader({ campaignId, placementId }: AttachmentUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<SelectedFile[]>([]);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const canUseClipboardApi = typeof navigator !== "undefined" && Boolean(navigator.clipboard?.read);

  useEffect(() => {
    return () => {
      items.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  const hasFiles = items.length > 0;

  const totalSize = useMemo(() => items.reduce((sum, item) => sum + item.file.size, 0), [items]);

  function replaceItems(nextItems: SelectedFile[]) {
    setItems((current) => {
      current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return nextItems;
    });
  }

  function appendFiles(fileList: FileList | File[], source: SelectedFile["source"]) {
    const files = Array.from(fileList).filter((file) => file.size > 0);
    if (!files.length) return;
    setError("");
    setItems((current) => [...current, ...buildSelectedFiles(files, source)]);
  }

  async function handleClipboardRead() {
    if (!canUseClipboardApi) {
      setError("Браузер не дал Clipboard API. Вставляй через Ctrl/Cmd+V.");
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith("image/")) {
            const blob = await clipboardItem.getType(type);
            files.push(new File([blob], `clipboard-${Date.now()}.${type.split("/")[1] || "png"}`, { type }));
          }
        }
      }

      if (!files.length) {
        setError("В буфере не нашлось изображений.");
        return;
      }

      appendFiles(files, "clipboard");
    } catch (clipboardError) {
      setError(clipboardError instanceof Error ? clipboardError.message : "Не удалось прочитать буфер обмена.");
    }
  }

  async function handleUpload() {
    if (!items.length) {
      setError("Сначала добавь файлы.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      for (const item of items) {
        const formData = new FormData();
        formData.append("file", item.file);
        if (campaignId) formData.append("campaignId", campaignId);
        if (placementId) formData.append("placementId", placementId);
        formData.append("source", item.source);

        const response = await fetch("/api/ads/attachments", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || "Не удалось загрузить файл.");
        }
      }

      replaceItems([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить файлы.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="ads-panel">
      <div className="ads-panel-title">
        <h2>Добавить файлы</h2>
      </div>
      <div
        className="ads-list"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          appendFiles(event.dataTransfer.files, "drag-drop");
        }}
        onPaste={(event) => {
          if (event.clipboardData?.files?.length) {
            event.preventDefault();
            appendFiles(event.clipboardData.files, "clipboard");
          }
        }}
        tabIndex={0}
        style={{ border: "1px dashed var(--ads-border, #d0d7de)", borderRadius: 8, padding: 16, outline: "none" }}
      >
        <div className="ads-list-row">
          <div>
            <strong>Drag & drop, выбор файла или Ctrl/Cmd+V</strong>
            <span>PNG, JPG, WEBP, PDF, XLSX, CSV, DOC, DOCX. До 15 МБ на файл.</span>
          </div>
          <div className="ads-actions">
            <button className="ads-button" type="button" onClick={() => fileInputRef.current?.click()}>
              Выбрать файлы
            </button>
            <button className="ads-button" type="button" onClick={handleClipboardRead}>
              Вставить из буфера
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) appendFiles(event.target.files, "upload");
          }}
        />

        {error ? <p className="ads-empty">{error}</p> : null}

        {hasFiles ? (
          <>
            <div className="ads-list">
              {items.map((item, index) => (
                <div className="ads-list-row" key={`${item.file.name}-${item.file.size}-${index}`}>
                  <div>
                    <strong>{item.file.name}</strong>
                    <span>{item.source} · {formatBytes(item.file.size)} · {item.file.type || "unknown"}</span>
                  </div>
                  <div>
                    {item.previewUrl ? (
                      <img
                        alt={item.file.name}
                        src={item.previewUrl}
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                      />
                    ) : (
                      <span>без превью</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="ads-list-row">
              <div>
                <strong>{items.length} файлов</strong>
                <span>Общий размер: {formatBytes(totalSize)}</span>
              </div>
              <div className="ads-actions">
                <button className="ads-button" type="button" onClick={() => replaceItems([])} disabled={isUploading}>
                  Очистить
                </button>
                <button className="ads-button ads-button-primary" type="button" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Загрузка..." : "Сохранить файлы"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="ads-empty">Файлы пока не выбраны.</p>
        )}
      </div>
    </div>
  );
}
