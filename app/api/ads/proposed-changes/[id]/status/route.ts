import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { writeAuditLog } from "@/lib/ads/audit";
import { formString, redirectBack } from "@/lib/ads/forms";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await context.params;
  const form = await request.formData();
  const status = formString(form, "status") ?? "needs_review";
  const before = await prisma.proposedChange.findUnique({ where: { id } });
  const after = await prisma.proposedChange.update({
    where: { id },
    data: { status, requiresCheckReason: formString(form, "requiresCheckReason") ?? before?.requiresCheckReason ?? null },
  });
  await writeAuditLog({ actorId: user.id, action: "update_proposed_change_status", entity: "ProposedChange", entityId: id, before, after });
  return NextResponse.redirect(redirectBack(request, "/ads/telegram"), { status: 303 });
}
