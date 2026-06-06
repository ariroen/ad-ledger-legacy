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
  const before = await prisma.placement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "placement not found" }, { status: 404 });

  const plannedAt = formDate(form, "plannedAt");
  const actualAt = formDate(form, "actualAt");
  const data = {
    plannedAt: form.has("plannedAt") ? plannedAt : undefined,
    actualAt: form.has("actualAt") ? actualAt : undefined,
    status: formString(form, "status") ?? undefined,
    priceRub: form.has("priceRub") ? formInt(form, "priceRub") : undefined,
    managerId: formString(form, "managerId"),
    postUrl: formString(form, "postUrl"),
    note: formString(form, "note"),
  };
  const after = await prisma.placement.update({ where: { id }, data });
  await writeAuditLog({ actorId: user.id, action: "update_placement", entity: "Placement", entityId: id, before, after });
  return NextResponse.json(after);
}
