import { prisma } from "./db";
import { ensureCampaignFoundation } from "./campaigns";
import { detectPlatform, normalizeChannelName, normalizeUrl } from "./normalize";

type ResolveCampaignInput = {
  campaignId?: string | null;
};

type ResolveChannelInput = {
  channelId?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  platform: string;
};

type ResolveManagerInput = {
  managerId?: string | null;
  managerName?: string | null;
  managerUsername?: string | null;
};

type CreatePlacementInput = {
  campaignId?: string | null;
  plannedAt: Date | string;
  platform: string;
  channelId?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  managerUsername?: string | null;
  priceRub?: number | null;
  status?: string | null;
  postUrl?: string | null;
  note?: string | null;
};

type UpdatePlacementInput = {
  campaignId?: string | null;
  plannedAt?: Date | string | null;
  actualAt?: Date | string | null;
  platform?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  managerUsername?: string | null;
  priceRub?: number | null;
  status?: string | null;
  postUrl?: string | null;
  note?: string | null;
};

type AddPlacementProofInput = {
  kind: string;
  url?: string | null;
  filePath?: string | null;
  note?: string | null;
};

type BulkCreatePlacementsInput = {
  campaignId?: string | null;
  defaultPlatform?: string | null;
  rows: Array<{
    plannedAt?: Date | string | null;
    platform?: string | null;
    channelName?: string | null;
    channelUrl?: string | null;
    managerName?: string | null;
    managerUsername?: string | null;
    priceRub?: number | null;
    status?: string | null;
    postUrl?: string | null;
    note?: string | null;
    proofUrl?: string | null;
    proofNote?: string | null;
  }>;
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid plannedAt date");
  return date;
}

function normalizedPlatform(value: string | null | undefined, fallback?: string | null) {
  const raw = String(value ?? fallback ?? "").trim();
  if (!raw) throw new Error("Platform is required");
  return detectPlatform(raw).toUpperCase();
}

export async function resolveCampaign(input: ResolveCampaignInput) {
  if (input.campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) throw new Error("Campaign not found");
    return campaign;
  }

  const activeCampaign = await prisma.campaign.findFirst({
    where: { status: "active" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  if (activeCampaign) return activeCampaign;
  return ensureCampaignFoundation();
}

export async function resolveChannel(input: ResolveChannelInput) {
  if (input.channelId) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) throw new Error("Channel not found");
    return channel;
  }

  const channelName = String(input.channelName ?? "").trim();
  const channelUrl = normalizeUrl(input.channelUrl);
  const platform = normalizedPlatform(input.platform, channelUrl ?? channelName);

  if (!channelName && !channelUrl) {
    throw new Error("Channel is required");
  }

  const existing =
    (channelUrl
      ? await prisma.channel.findFirst({
          where: { url: channelUrl, platform },
        })
      : null) ??
    (channelName
      ? await prisma.channel.findFirst({
          where: { name: channelName, platform },
        })
      : null);

  if (existing) {
    if (channelUrl && !existing.url) {
      return prisma.channel.update({
        where: { id: existing.id },
        data: { url: channelUrl },
      });
    }
    return existing;
  }

  if (!channelName) throw new Error("Channel name is required");

  return prisma.channel.create({
    data: {
      name: channelName,
      normalizedName: normalizeChannelName(channelName || channelUrl),
      platform,
      url: channelUrl,
      source: "manual",
    },
  });
}

export async function resolveManager(input: ResolveManagerInput) {
  if (input.managerId) {
    const manager = await prisma.manager.findUnique({ where: { id: input.managerId } });
    if (!manager) throw new Error("Manager not found");
    return manager;
  }

  const managerName = String(input.managerName ?? "").trim();
  const managerUsername = String(input.managerUsername ?? "").trim() || null;
  if (!managerName) return null;

  const existing = await prisma.manager.findUnique({ where: { name: managerName } });
  if (existing) {
    if (managerUsername && !existing.username) {
      return prisma.manager.update({
        where: { id: existing.id },
        data: { username: managerUsername },
      });
    }
    return existing;
  }

  return prisma.manager.create({
    data: {
      name: managerName,
      username: managerUsername,
      source: "manual",
    },
  });
}

async function loadPlacementWithRelations(id: string) {
  return prisma.placement.findUnique({
    where: { id },
    include: { channel: true, manager: true, campaign: true, proofs: true, payments: true },
  });
}

export async function createPlacement(input: CreatePlacementInput) {
  const campaign = await resolveCampaign({ campaignId: input.campaignId });
  const plannedAt = asDate(input.plannedAt);
  if (!plannedAt) throw new Error("plannedAt is required");
  const platform = normalizedPlatform(input.platform, input.channelUrl ?? input.channelName);
  const channel = await resolveChannel({
    channelId: input.channelId,
    channelName: input.channelName,
    channelUrl: input.channelUrl,
    platform,
  });
  const manager = await resolveManager({
    managerId: input.managerId,
    managerName: input.managerName,
    managerUsername: input.managerUsername,
  });

  const placement = await prisma.placement.create({
    data: {
      campaignId: campaign.id,
      plannedAt,
      platform,
      channelId: channel.id,
      managerId: manager?.id ?? null,
      priceRub: input.priceRub ?? null,
      status: input.status?.trim() || "запланировано",
      postUrl: normalizeUrl(input.postUrl),
      note: input.note?.trim() || null,
    },
  });

  const result = await loadPlacementWithRelations(placement.id);
  if (!result) throw new Error("Placement not found after create");
  return result;
}

export async function updatePlacement(id: string, input: UpdatePlacementInput) {
  const existing = await prisma.placement.findUnique({
    where: { id },
    include: { channel: true, manager: true, campaign: true },
  });
  if (!existing) throw new Error("Placement not found");

  const platform = normalizedPlatform(input.platform ?? existing.platform, input.channelUrl ?? input.channelName ?? existing.channel.url ?? existing.channel.name);
  const shouldResolveChannel =
    input.channelId !== undefined ||
    input.channelName !== undefined ||
    input.channelUrl !== undefined ||
    input.platform !== undefined;
  const shouldResolveManager =
    input.managerId !== undefined ||
    input.managerName !== undefined ||
    input.managerUsername !== undefined;

  const campaign = input.campaignId !== undefined
    ? await resolveCampaign({ campaignId: input.campaignId })
    : existing.campaign;
  const channel = shouldResolveChannel
    ? await resolveChannel({
        channelId: input.channelId,
        channelName: input.channelName ?? existing.channel.name,
        channelUrl: input.channelUrl ?? existing.channel.url,
        platform,
      })
    : existing.channel;
  const manager = shouldResolveManager
    ? await resolveManager({
        managerId: input.managerId,
        managerName: input.managerName,
        managerUsername: input.managerUsername,
      })
    : existing.manager;

  await prisma.placement.update({
    where: { id },
    data: {
      campaignId: campaign?.id ?? null,
      plannedAt: input.plannedAt !== undefined ? asDate(input.plannedAt) : undefined,
      actualAt: input.actualAt !== undefined ? asDate(input.actualAt) : undefined,
      platform,
      channelId: channel.id,
      managerId: manager?.id ?? null,
      priceRub: input.priceRub !== undefined ? input.priceRub : undefined,
      status: input.status !== undefined ? input.status?.trim() || "" : undefined,
      postUrl: input.postUrl !== undefined ? normalizeUrl(input.postUrl) : undefined,
      note: input.note !== undefined ? input.note?.trim() || null : undefined,
    },
  });

  const result = await loadPlacementWithRelations(id);
  if (!result) throw new Error("Placement not found after update");
  return result;
}

export async function deletePlacement(id: string) {
  const placement = await prisma.placement.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!placement) throw new Error("Placement not found");

  await prisma.placementProof.deleteMany({ where: { placementId: id } });
  await prisma.attachment.deleteMany({ where: { placementId: id } });
  await prisma.referralLink.deleteMany({ where: { placementId: id } });
  await prisma.payment.updateMany({
    where: { placementId: id },
    data: { placementId: null },
  });
  await prisma.placement.delete({ where: { id } });
  return { ok: true };
}

export async function addPlacementProof(placementId: string, input: AddPlacementProofInput) {
  const placement = await prisma.placement.findUnique({ where: { id: placementId } });
  if (!placement) throw new Error("Placement not found");

  const proof = await prisma.placementProof.create({
    data: {
      placementId,
      kind: input.kind,
      url: normalizeUrl(input.url),
      filePath: input.filePath?.trim() || null,
      note: input.note?.trim() || null,
    },
  });

  return proof;
}

export async function bulkCreatePlacements(input: BulkCreatePlacementsInput) {
  const createdPlacements = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const [index, row] of input.rows.entries()) {
    try {
      if (!row.plannedAt || !row.channelName?.trim()) {
        skipped += 1;
        errors.push(`row ${index + 1}: missing plannedAt or channelName`);
        continue;
      }

      const placement = await createPlacement({
        campaignId: input.campaignId,
        plannedAt: row.plannedAt,
        platform: row.platform || input.defaultPlatform || "TG",
        channelName: row.channelName,
        channelUrl: row.channelUrl,
        managerName: row.managerName,
        managerUsername: row.managerUsername,
        priceRub: row.priceRub ?? null,
        status: row.status ?? "запланировано",
        postUrl: row.postUrl,
        note: row.note,
      });

      if (row.proofUrl || row.proofNote) {
        await addPlacementProof(placement.id, {
          kind: row.proofUrl ? "link" : "other",
          url: row.proofUrl,
          note: row.proofNote,
        });
      }

      createdPlacements.push(placement);
    } catch (error) {
      skipped += 1;
      errors.push(`row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    created: createdPlacements.length,
    skipped,
    errors,
    createdPlacements,
  };
}
