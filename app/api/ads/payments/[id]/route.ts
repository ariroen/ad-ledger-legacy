import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { writeAuditLog } from "@/lib/ads/audit";
import { formDate, formInt, formString } from "@/lib/ads/forms";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const form = await request.formData();
  const before = await prisma.payment.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "payment not found" }, { status: 404 });
  const after = await prisma.payment.update({
    where: { id },
    data: {
      amountRub: form.has("amountRub") ? formInt(form, "amountRub") ?? undefined : undefined,
      paidAt: form.has("paidAt") ? formDate(form, "paidAt") : undefined,
      method: formString(form, "method") ?? undefined,
      status: formString(form, "status") ?? undefined,
      note: formString(form, "note") ?? undefined,
    },
  });
  await writeAuditLog({ actorId: user.id, action: "update_payment", entity: "Payment", entityId: id, before, after });
  return NextResponse.json(after);
}
