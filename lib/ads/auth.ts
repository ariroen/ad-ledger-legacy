import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

const COOKIE_NAME = "ads_session";
const PASSWORD_PREFIX = "scrypt";

function sessionSecret() {
  return process.env.ADS_SESSION_SECRET || "local-dev-secret-change-me";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");
  if (prefix !== PASSWORD_PREFIX || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createSessionCookieValue(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionCookieValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      expiresAt: number;
    };
    if (!decoded.userId || decoded.expiresAt < Date.now()) return null;
    return prisma.user.findUnique({ where: { id: decoded.userId } });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/ads/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/ads");
  return user;
}
