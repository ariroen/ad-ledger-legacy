import { dateTime } from "@/lib/ads/format";
import { getAttachmentDownloadHref, getAttachmentOpenHref, isAttachmentImage } from "@/lib/ads/attachments";

type AttachmentListProps = {
  attachments: Array<{
    id: string;
    kind: string;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    source: string | null;
    createdAt: Date;
  }>;
  emptyText: string;
};

function formatBytes(value: number | null) {
  if (!value || value <= 0) return "0 Б";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
}

export function AttachmentList({ attachments, emptyText }: AttachmentListProps) {
  if (!attachments.length) {
    return <p className="ads-empty">{emptyText}</p>;
  }

  return (
    <div className="ads-list">
      {attachments.map((attachment) => (
        <div className="ads-list-row" key={attachment.id}>
          <div>
            <strong>{attachment.fileName ?? "Файл"}</strong>
            <span>{attachment.kind} · {attachment.mimeType ?? "unknown"} · {formatBytes(attachment.fileSize)}</span>
            <span>{attachment.source ?? "upload"} · {dateTime(attachment.createdAt)}</span>
          </div>
          <div className="ads-actions">
            {isAttachmentImage(attachment.mimeType) ? (
              <img
                alt={attachment.fileName ?? "attachment"}
                src={getAttachmentOpenHref(attachment.id)}
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
              />
            ) : null}
            <a className="ads-button" href={getAttachmentOpenHref(attachment.id)} target="_blank" rel="noreferrer">
              Открыть
            </a>
            <a className="ads-button" href={getAttachmentDownloadHref(attachment.id)}>
              Скачать
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
