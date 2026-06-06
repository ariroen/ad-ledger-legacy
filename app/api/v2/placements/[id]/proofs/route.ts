import { NextResponse } from "next/server";

import { addPlacementProof } from "@/lib/ads/placements-service";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  // TODO: protect API token for OpenClaw/Codex
  try {
    const { id } = await params;
    const body = await request.json();
    const proof = await addPlacementProof(id, body);
    return NextResponse.json({ ok: true, data: proof });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}
