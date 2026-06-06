import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ads/auth";
import { importTelegramJsonl } from "@/lib/ads/importers";

export const runtime = "nodejs";

export async function POST() {
  const user = await requireAdmin();
  const result = await importTelegramJsonl(undefined, user.id);
  return NextResponse.json(result);
}
