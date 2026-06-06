import { NextResponse } from "next/server";

import { prisma } from "@/lib/ads/db";
import { getPlacements } from "@/lib/ads/queries";
import { createPlacement } from "@/lib/ads/placements-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // TODO: protect API token for OpenClaw/Codex
  const { searchParams } = new URL(request.url);
  const placements = await getPlacements({
    campaignId: searchParams.get("campaignId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    managerId: searchParams.get("managerId") ?? undefined,
    query: searchParams.get("q") ?? undefined,
  });

  return NextResponse.json({ ok: true, placements });
}

export async function POST(request: Request) {
  // TODO: protect API token for OpenClaw/Codex
  try {
    const body = await request.json();
    const placement = await createPlacement(body);
    return NextResponse.json({ ok: true, data: placement });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
