import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { writeAuditLog } from "@/lib/ads/audit";
import { formDate, formInt, formString, redirectBack } from "@/lib/ads/forms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  const amountRub = formInt(form, "amountRub");
  if (!amountRub) return NextResponse.json({ error: "amountRub is required" }, { status: 400 });
  const payment = await prisma.payment.create({
    data: {
      amountRub,
      paidAt: formDate(form, "paidAt"),
      method: formString(form, "method"),
      status: formString(form, "status") ?? "оплачен",
      note: formString(form, "note"),
      invoiceId: formString(form, "invoiceId"),
      placementId: formString(form, "placementId"),
      networkId: formString(form, "networkId"),
    },
  });
  await writeAuditLog({ actorId: user.id, action: "create_payment", entity: "Payment", entityId: payment.id, after: payment });
  return NextResponse.redirect(redirectBack(request, "/ads/finance"), { status: 303 });
}
