import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ads/auth";
import { applyProposedChange } from "@/lib/ads/proposed-changes";
import { redirectBack } from "@/lib/ads/forms";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await context.params;
  await applyProposedChange(id, user.id);
  return NextResponse.redirect(redirectBack(request, "/ads/telegram"), { status: 303 });
}
