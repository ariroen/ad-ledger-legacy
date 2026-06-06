import { prisma } from "./db";
import { ensureCampaignFoundation } from "./campaigns";

function buildProofSet(rows: Array<{ placementId: string }>) {
  return new Set(rows.map((item) => item.placementId));
}

export async function getAdsDashboard() {
  await ensureCampaignFoundation();
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(today.getUTCDate() + 7);
  const activeCampaign = await prisma.campaign.findFirst({
    where: { status: "active" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const activeCampaignId = activeCampaign?.id;

  const [
    placementsTotal,
    pendingTelegram,
    requiresCheck,
    upcoming,
    recentPlacements,
    statusGroups,
    activeCampaignProofRows,
  ] = await Promise.all([
    prisma.placement.count({
      where: { campaignId: activeCampaignId || undefined },
    }),
    prisma.telegramMessage.count({ where: { reviewStatus: "pending" } }),
    prisma.placement.count({
      where: { campaignId: activeCampaignId || undefined, status: "требует проверки" },
    }),
    prisma.placement.findMany({
      where: {
        campaignId: activeCampaignId || undefined,
        plannedAt: { gte: today, lte: weekEnd },
      },
      include: { channel: true, network: true, manager: true, campaign: true },
      orderBy: { plannedAt: "asc" },
      take: 12,
    }),
    prisma.placement.findMany({
      where: { campaignId: activeCampaignId || undefined },
      include: { channel: true, network: true, manager: true, campaign: true },
      orderBy: { plannedAt: "desc" },
      take: 12,
    }),
    prisma.placement.groupBy({
      by: ["status"],
      where: { campaignId: activeCampaignId || undefined },
      _count: true,
    }),
    activeCampaignId
      ? prisma.placementProof.findMany({
          where: { placement: { campaignId: activeCampaignId } },
          select: { placementId: true },
          distinct: ["placementId"],
        })
      : [],
  ]);

  return {
    activeCampaign,
    placementsTotal,
    pendingTelegram,
    requiresCheck,
    upcoming,
    recentPlacements,
    statusGroups,
    withoutProof: Math.max(placementsTotal - activeCampaignProofRows.length, 0),
  };
}

export async function getCampaignsOverview() {
  await ensureCampaignFoundation();

  const campaigns = await prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      month: true,
      year: true,
      budgetRub: true,
      status: true,
      note: true,
      placements: {
        select: {
          id: true,
          channelId: true,
          managerId: true,
          status: true,
          plannedAt: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const placementIds = campaigns.flatMap((campaign) => campaign.placements.map((placement) => placement.id));
  const proofRows = placementIds.length
    ? await prisma.placementProof.findMany({
        where: { placementId: { in: placementIds } },
        select: { placementId: true },
        distinct: ["placementId"],
      })
    : [];
  const proofSet = buildProofSet(proofRows);
  const today = new Date();

  return campaigns.map((campaign) => {
    const placementsCount = campaign.placements.length;
    const channelsCount = new Set(campaign.placements.map((placement) => placement.channelId)).size;
    const managersCount = new Set(
      campaign.placements
        .map((placement) => placement.managerId)
        .filter((managerId): managerId is string => Boolean(managerId)),
    ).size;
    const proofCount = campaign.placements.filter((placement) => proofSet.has(placement.id)).length;
    const withoutProofCount = campaign.placements.filter((placement) => !proofSet.has(placement.id)).length;
    const withoutStatusCount = campaign.placements.filter((placement) => !placement.status.trim()).length;
    const requiresCheckCount = campaign.placements.filter((placement) => placement.status === "требует проверки").length;
    const upcomingCount = campaign.placements.filter((placement) => placement.plannedAt && placement.plannedAt >= today).length;

    return {
      ...campaign,
      placementsCount,
      channelsCount,
      managersCount,
      proofCount,
      withoutProofCount,
      withoutStatusCount,
      requiresCheckCount,
      upcomingCount,
    };
  });
}

export async function getCampaignDetail(id: string) {
  await ensureCampaignFoundation();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      month: true,
      year: true,
      budgetRub: true,
      status: true,
      note: true,
    },
  });

  if (!campaign) return null;

  const placements = await prisma.placement.findMany({
    where: { campaignId: campaign.id },
    include: { channel: true, manager: true, campaign: true, proofs: true, payments: true },
    orderBy: [{ plannedAt: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  const proofRows = placements.length
    ? await prisma.placementProof.findMany({
        where: { placementId: { in: placements.map((placement) => placement.id) } },
        select: { placementId: true },
        distinct: ["placementId"],
      })
    : [];
  const proofSet = buildProofSet(proofRows);
  const channelsCount = new Set(placements.map((placement) => placement.channelId)).size;
  const managersCount = new Set(
    placements
      .map((placement) => placement.managerId)
      .filter((managerId): managerId is string => Boolean(managerId)),
  ).size;
  const proofCount = placements.filter((placement) => proofSet.has(placement.id)).length;
  const withoutProof = placements.filter((placement) => !proofSet.has(placement.id));
  const withoutStatus = placements.filter((placement) => !placement.status.trim());
  const requiresCheck = placements.filter((placement) => placement.status === "требует проверки");
  const today = new Date();
  const upcomingPlacements = placements
    .filter((placement) => placement.plannedAt && placement.plannedAt >= today)
    .sort((a, b) => (a.plannedAt?.getTime() ?? 0) - (b.plannedAt?.getTime() ?? 0))
    .slice(0, 10);
  const recentPlacements = [...placements]
    .sort((a, b) => (b.plannedAt?.getTime() ?? 0) - (a.plannedAt?.getTime() ?? 0))
    .slice(0, 10);

  return {
    campaign,
    placements,
    proofSet,
    stats: {
      placementsCount: placements.length,
      channelsCount,
      managersCount,
      proofCount,
      withoutProofCount: withoutProof.length,
      withoutStatusCount: withoutStatus.length,
      requiresCheckCount: requiresCheck.length,
    },
    withoutProof,
    withoutStatus,
    upcomingPlacements,
    recentPlacements,
  };
}

export async function getPlacements(params?: {
  campaignId?: string;
  status?: string;
  platform?: string;
  date?: string;
  managerId?: string;
  query?: string;
}) {
  await ensureCampaignFoundation();
  const query = params?.query?.trim();
  const date = params?.date?.trim();
  const dateStart = date ? new Date(`${date}T00:00:00.000Z`) : null;
  const dateEnd = date ? new Date(`${date}T23:59:59.999Z`) : null;
  return prisma.placement.findMany({
    where: {
      campaignId: params?.campaignId || undefined,
      status: params?.status || undefined,
      platform: params?.platform || undefined,
      managerId: params?.managerId || undefined,
      plannedAt: dateStart && dateEnd ? { gte: dateStart, lte: dateEnd } : undefined,
      OR: query
        ? [
            { channel: { name: { contains: query } } },
            { network: { name: { contains: query } } },
            { manager: { name: { contains: query } } },
            { note: { contains: query } },
          ]
        : undefined,
    },
    include: { channel: true, network: true, manager: true, proofs: true, payments: true, campaign: true },
    orderBy: [{ plannedAt: "asc" }, { createdAt: "desc" }],
    take: 300,
  });
}

export async function getCampaignsForSelect() {
  await ensureCampaignFoundation();
  return prisma.campaign.findMany({
    select: { id: true, name: true, status: true, month: true, year: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getNetworks() {
  return prisma.network.findMany({
    include: {
      channels: { orderBy: { name: "asc" } },
      _count: { select: { placements: true, channels: true } },
    },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
  });
}

export async function getTelegramInbox() {
  return prisma.telegramMessage.findMany({
    include: { attachments: true, proposedChanges: { orderBy: { createdAt: "desc" } } },
    orderBy: { receivedAt: "desc" },
    take: 150,
  });
}

export async function getFinance() {
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      include: { payments: true, attachments: true },
      orderBy: { issuedAt: "desc" },
      take: 200,
    }),
    prisma.payment.findMany({
      include: { invoice: true, network: true, placement: { include: { channel: true } } },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
  ]);
  return { invoices, payments };
}

export async function getRequiresCheck() {
  const [placements, telegram, channels] = await Promise.all([
    prisma.placement.findMany({
      where: { status: "требует проверки" },
      include: { channel: true, network: true, manager: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.telegramMessage.findMany({
      where: { reviewStatus: "pending" },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.channel.findMany({
      where: { url: null },
      include: { network: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  return { placements, telegram, channels };
}

export async function getManagers() {
  return prisma.manager.findMany({ orderBy: { name: "asc" } });
}

export async function getChannelsForSelect() {
  return prisma.channel.findMany({
    select: { id: true, name: true, platform: true },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
    take: 1000,
  });
}

export async function getNetworksForSelect() {
  return prisma.network.findMany({
    select: { id: true, name: true, platform: true },
    orderBy: [{ platform: "asc" }, { name: "asc" }],
  });
}

export async function getChannelDetail(id: string) {
  return prisma.channel.findUnique({
    where: { id },
    include: {
      network: true,
      placements: {
        include: { manager: true, network: true, proofs: true, payments: true },
        orderBy: { plannedAt: "desc" },
      },
    },
  });
}

export async function getNetworkDetail(id: string) {
  return prisma.network.findUnique({
    where: { id },
    include: {
      channels: { orderBy: { name: "asc" } },
      placements: {
        include: { channel: true, manager: true, proofs: true, payments: true },
        orderBy: { plannedAt: "desc" },
      },
      payments: { include: { invoice: true }, orderBy: { paidAt: "desc" } },
    },
  });
}

export async function getCalendarPlacements(params?: {
  from?: Date;
  to?: Date;
  platform?: string;
  networkId?: string;
  managerId?: string;
}) {
  const now = new Date();
  const from = params?.from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
  const to = params?.to ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 31));
  return prisma.placement.findMany({
    where: {
      plannedAt: { gte: from, lte: to },
      platform: params?.platform || undefined,
      networkId: params?.networkId || undefined,
      managerId: params?.managerId || undefined,
    },
    include: { channel: true, network: true, manager: true },
    orderBy: { plannedAt: "asc" },
    take: 700,
  });
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
}

export async function getImportRuns() {
  return prisma.importRun.findMany({
    include: { actor: true, items: { where: { requiresCheck: true }, take: 20, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getDashboardBackups() {
  return prisma.backupSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 14 });
}
