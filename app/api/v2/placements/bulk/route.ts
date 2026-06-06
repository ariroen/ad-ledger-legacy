import { NextResponse } from "next/server";

import { bulkCreatePlacements } from "@/lib/ads/placements-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // TODO: protect API token for OpenClaw/Codex
  try {
    const body = await request.json();
    const result = await bulkCreatePlacements(body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
