import { NextResponse } from "next/server";
import { prisma } from "@/lib/ads/db";
import { setSession, verifyPassword } from "@/lib/ads/auth";

export const runtime = "nodejs";

function redirectUrl(request: Request, pathname: string) {
  const current = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || current.host;
  const proto = request.headers.get("x-forwarded-proto") || current.protocol.replace(/:$/, "");
  return new URL(pathname, `${proto}://${host}`);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(redirectUrl(request, "/ads/login?error=1"), { status: 303 });
  }

  await setSession(user.id);
  return NextResponse.redirect(redirectUrl(request, "/ads"), { status: 303 });
}
