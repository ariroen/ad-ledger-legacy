import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ads/auth";
import { importAllAdsData } from "@/lib/ads/importers";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireAdmin();
    const result = await importAllAdsData(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
}
