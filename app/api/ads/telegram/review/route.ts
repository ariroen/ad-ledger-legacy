import { NextResponse } from "next/server";
import { prisma } from "@/lib/ads/db";
import { requireAdmin } from "@/lib/ads/auth";
import { writeAuditLog } from "@/lib/ads/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireAdmin();
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const reviewStatus = String(form.get("reviewStatus") ?? "reviewed");
  const before = await prisma.telegramMessage.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "message not found" }, { status: 404 });

  const after = await prisma.telegramMessage.update({
    where: { id },
    data: { reviewStatus },
  });
  await writeAuditLog({
    actorId: user.id,
    action: "review_telegram_message",
    entity: "TelegramMessage",
    entityId: id,
    before,
    after,
  });

  return NextResponse.redirect(new URL("/ads/telegram", request.url), { status: 303 });
}
