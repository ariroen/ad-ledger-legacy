import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/ads/auth";
import { createBackupSnapshot, getBackupSnapshots } from "@/lib/ads/backups";
import { redirectBack } from "@/lib/ads/forms";

export const runtime = "nodejs";

export async function GET() {
  await requireUser();
  return NextResponse.json(await getBackupSnapshots());
}

export async function POST(request: Request) {
  await requireAdmin();
  await createBackupSnapshot("manual", "Создано из интерфейса");
  return NextResponse.redirect(redirectBack(request, "/ads/backups"), { status: 303 });
}
