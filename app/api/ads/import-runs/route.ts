import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { getImportRuns } from "@/lib/ads/queries";

export const runtime = "nodejs";

export async function GET() {
  await requireUser();
  return NextResponse.json(await getImportRuns());
}
