import { basename } from "node:path";

import { ALLOWED_MIME_TYPES, ATTACHMENT_ACCEPT, EXTENSION_TO_MIME, MAX_ATTACHMENT_SIZE } from "./attachment-config";
import { prisma } from "./db";
import { saveUpload } from "./files";

type AttachmentSource = "upload" | "drag-drop" | "clipboard";

type CreateAttachmentInput = {
  file: File;
  source: AttachmentSource;
  campaignId?: string | null;
  placementId?: string | null;
};

function extensionFromName(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function resolveMimeType(file: File) {
  const fileType = String(file.type || "").trim().toLowerCase();
  if (ALLOWED_MIME_TYPES.has(fileType)) return fileType;
  return EXTENSION_TO_MIME.get(extensionFromName(file.name)) ?? fileType;
}

function isImageMimeType(mimeType: string | null | undefined) {
  return String(mimeType || "").startsWith("image/");
}

export function getAttachmentKind(mimeType: string | null | undefined, fileName: string | null | undefined) {
  const resolvedMimeType = String(mimeType || "").trim().toLowerCase() || EXTENSION_TO_MIME.get(extensionFromName(fileName || "")) || "";
  if (resolvedMimeType.startsWith("image/")) return "image";
  if (resolvedMimeType === "application/pdf") return "pdf";
  if (resolvedMimeType.includes("sheet") || resolvedMimeType.includes("excel") || resolvedMimeType === "text/csv") return "spreadsheet";
  if (resolvedMimeType.includes("word")) return "document";
  return "file";
}

export function formatAttachmentError(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось загрузить файл.";
}

function assertFileSupported(file: File) {
  const mimeType = resolveMimeType(file);
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Неподдерживаемый тип файла. Разрешены PNG, JPG, WEBP, PDF, XLSX, CSV, DOC и DOCX.");
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Файл слишком большой. Лимит — 15 МБ.");
  }

  return mimeType;
}

export async function createAttachment(input: CreateAttachmentInput) {
  if (!input.campaignId && !input.placementId) {
    throw new Error("Нужно выбрать кампанию или размещение для файла.");
  }

  const mimeType = assertFileSupported(input.file);
  const placement = input.placementId
    ? await prisma.placement.findUnique({
        where: { id: input.placementId },
        select: { id: true, campaignId: true },
      })
    : null;

  if (input.placementId && !placement) {
    throw new Error("Размещение для файла не найдено.");
  }

  if (input.campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { id: true },
    });
    if (!campaign) throw new Error("Кампания для файла не найдена.");
  }

  const savedPath = await saveUpload(input.file, "attachments");

  return prisma.attachment.create({
    data: {
      kind: getAttachmentKind(mimeType, input.file.name),
      fileName: basename(input.file.name),
      filePath: savedPath,
      mimeType,
      fileSize: input.file.size,
      source: input.source,
      campaignId: input.campaignId ?? placement?.campaignId ?? null,
      placementId: input.placementId ?? null,
    },
  });
}

export async function getAttachmentFile(id: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      mimeType: true,
      kind: true,
      fileSize: true,
      source: true,
      createdAt: true,
      campaignId: true,
      placementId: true,
    },
  });

  if (!attachment?.filePath) return null;
  return attachment;
}

export function getAttachmentOpenHref(id: string) {
  return `/api/ads/attachments/${id}`;
}

export function getAttachmentDownloadHref(id: string) {
  return `/api/ads/attachments/${id}?download=1`;
}

export function isAttachmentImage(mimeType: string | null | undefined) {
  return isImageMimeType(mimeType);
}
