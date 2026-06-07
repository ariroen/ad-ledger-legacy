import { NextResponse } from "next/server";

import { recordReferralClick } from "@/lib/ads/referrals";

export const runtime = "nodejs";

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referralLink = await recordReferralClick({
    code,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
    ip: getRequestIp(request),
  });

  if (!referralLink) {
    return NextResponse.json({ error: "Ссылка не найдена." }, { status: 404 });
  }

  return NextResponse.redirect(referralLink.sourceUrl, { status: 307 });
}
