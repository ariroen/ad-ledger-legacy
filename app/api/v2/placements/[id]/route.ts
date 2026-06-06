import { NextResponse } from "next/server";

import { prisma } from "@/lib/ads/db";
import { deletePlacement, updatePlacement } from "@/lib/ads/placements-service";

export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  // TODO: protect API token for OpenClaw/Codex
  const { id } = await params;
  const placement = await prisma.placement.findUnique({
    where: { id },
    include: { channel: true, manager: true, campaign: true, proofs: true, payments: true },
  });

  if (!placement) {
    return NextResponse.json({ ok: false, error: "Placement not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: placement });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  // TODO: protect API token for OpenClaw/Codex
  try {
    const { id } = await params;
    const body = await request.json();
    const placement = await updatePlacement(id, body);
    return NextResponse.json({ ok: true, data: placement });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  // TODO: protect API token for OpenClaw/Codex
  try {
    const { id } = await params;
    const result = await deletePlacement(id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}
