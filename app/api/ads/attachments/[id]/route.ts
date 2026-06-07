import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/ads/auth";
import { getAttachmentFile } from "@/lib/ads/attachments";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const attachment = await getAttachmentFile(id);

  if (!attachment?.filePath) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(attachment.filePath);
    const isDownload = new URL(request.url).searchParams.get("download") === "1";
    const headers = new Headers();
    headers.set("Content-Type", attachment.mimeType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(attachment.fileName || "attachment")}"`,
    );

    return new NextResponse(fileBuffer, { headers });
  } catch {
    return NextResponse.json({ error: "Не удалось открыть файл." }, { status: 404 });
  }
}
