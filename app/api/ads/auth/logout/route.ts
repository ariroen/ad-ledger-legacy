import { NextResponse } from "next/server";
import { clearSession } from "@/lib/ads/auth";

export const runtime = "nodejs";

function redirectUrl(request: Request, pathname: string) {
  const current = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || current.host;
  const proto = request.headers.get("x-forwarded-proto") || current.protocol.replace(/:$/, "");
  return new URL(pathname, `${proto}://${host}`);
}

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(redirectUrl(request, "/ads/login"), { status: 303 });
}
