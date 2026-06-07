import { createHash, randomBytes } from "node:crypto";

import { prisma } from "./db";
import { normalizeUrl } from "./normalize";

type CreateReferralLinkInput = {
  sourceUrl: string;
  status?: string | null;
  channelId?: string | null;
  campaignId?: string | null;
  placementId?: string | null;
};

type RecordReferralClickInput = {
  code: string;
  userAgent?: string | null;
  referrer?: string | null;
  ip?: string | null;
};

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim() || "active";
}

async function generateReferralCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    if (!candidate) continue;
    const existing = await prisma.referralLink.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }

  throw new Error("Не удалось сгенерировать код ссылки.");
}

function hashIp(ip: string | null | undefined) {
  const value = String(ip || "").trim();
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export function getReferralHref(code: string) {
  return `/r/${code}`;
}

export async function createReferralLink(input: CreateReferralLinkInput) {
  const sourceUrl = normalizeUrl(input.sourceUrl);
  if (!sourceUrl) throw new Error("Нужна корректная исходная ссылка.");

  let channelId = input.channelId ?? null;
  let campaignId = input.campaignId ?? null;

  if (input.placementId) {
    const placement = await prisma.placement.findUnique({
      where: { id: input.placementId },
      select: {
        id: true,
        channelId: true,
        campaignId: true,
      },
    });

    if (!placement) throw new Error("Размещение для реферальной ссылки не найдено.");
    channelId = channelId ?? placement.channelId;
    campaignId = campaignId ?? placement.campaignId ?? null;
  }

  if (channelId) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true },
    });
    if (!channel) throw new Error("Канал для реферальной ссылки не найден.");
  }

  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) throw new Error("Кампания для реферальной ссылки не найдена.");
  }

  const code = await generateReferralCode();

  return prisma.referralLink.create({
    data: {
      code,
      sourceUrl,
      status: normalizeStatus(input.status),
      channelId,
      campaignId,
      placementId: input.placementId ?? null,
    },
    include: {
      channel: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      placement: { select: { id: true, plannedAt: true } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export async function recordReferralClick(input: RecordReferralClickInput) {
  const referralLink = await prisma.referralLink.findUnique({
    where: { code: input.code },
    select: {
      id: true,
      code: true,
      sourceUrl: true,
      status: true,
    },
  });

  if (!referralLink) return null;

  if (referralLink.status !== "active") {
    return referralLink;
  }

  await prisma.$transaction([
    prisma.referralEvent.create({
      data: {
        referralLinkId: referralLink.id,
        userAgent: String(input.userAgent || "").trim() || null,
        referrer: String(input.referrer || "").trim() || null,
        ipHash: hashIp(input.ip),
      },
    }),
    prisma.referralLink.update({
      where: { id: referralLink.id },
      data: { clicksCount: { increment: 1 } },
    }),
  ]);

  return referralLink;
}
