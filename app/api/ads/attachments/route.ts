import { NextResponse } from "next/server";

import { createAttachment, formatAttachmentError } from "@/lib/ads/attachments";
import { requireUser } from "@/lib/ads/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();

  const form = await request.formData();
  const file = form.get("file");
  const campaignId = String(form.get("campaignId") || "").trim() || null;
  const placementId = String(form.get("placementId") || "").trim() || null;
  const source = String(form.get("source") || "upload").trim() || "upload";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан." }, { status: 400 });
  }

  try {
    const attachment = await createAttachment({
      file,
      campaignId,
      placementId,
      source: source === "drag-drop" || source === "clipboard" ? source : "upload",
    });

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      source: attachment.source,
      createdAt: attachment.createdAt,
    });
  } catch (error) {
    return NextResponse.json({ error: formatAttachmentError(error) }, { status: 400 });
  }
}
