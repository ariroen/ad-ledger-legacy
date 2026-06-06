import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { writeAuditLog } from "@/lib/ads/audit";
import { formDate, formInt, formString, redirectBack } from "@/lib/ads/forms";
import { saveUpload } from "@/lib/ads/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const form = await request.formData();
  const file = form.get("file");
  const filePath = file instanceof File && file.size > 0 ? await saveUpload(file, "invoices") : null;
  const invoice = await prisma.invoice.create({
    data: {
      number: formString(form, "number"),
      issuedAt: formDate(form, "issuedAt"),
      contractor: formString(form, "contractor"),
      amountRub: formInt(form, "amountRub"),
      status: formString(form, "status") ?? "счёт получен",
      filePath,
      note: formString(form, "note"),
    },
  });
  await writeAuditLog({ actorId: user.id, action: "create_invoice", entity: "Invoice", entityId: invoice.id, after: invoice });
  return NextResponse.redirect(redirectBack(request, "/ads/finance"), { status: 303 });
}
