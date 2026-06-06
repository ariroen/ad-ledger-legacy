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
  const before = await prisma.invoice.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "invoice not found" }, { status: 404 });
  const after = await prisma.invoice.update({
    where: { id },
    data: {
      number: formString(form, "number") ?? undefined,
      issuedAt: form.has("issuedAt") ? formDate(form, "issuedAt") : undefined,
      contractor: formString(form, "contractor") ?? undefined,
      amountRub: form.has("amountRub") ? formInt(form, "amountRub") : undefined,
      status: formString(form, "status") ?? undefined,
      note: formString(form, "note") ?? undefined,
    },
  });
  await writeAuditLog({ actorId: user.id, action: "update_invoice", entity: "Invoice", entityId: id, before, after });
  return NextResponse.json(after);
}
