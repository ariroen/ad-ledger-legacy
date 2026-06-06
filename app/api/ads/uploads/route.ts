import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { saveUpload } from "@/lib/ads/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireUser();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  const filePath = await saveUpload(file, "uploads");
  return NextResponse.json({ filePath });
}
