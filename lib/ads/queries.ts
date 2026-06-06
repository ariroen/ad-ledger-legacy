import { prisma } from "./db";

export async function getAdsDashboard() {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(today.getUTCDate() + 7);

  const [
    placementsTotal,
    channelsTotal,
    networksTotal,
    pendingTelegram,
    requiresCheck,
    upcoming,
    recentPlacements,
    statusGroups,
    financeGroups,
  ] = await Promise.all([
    prisma.placement.count(),
    prisma.channel.count(),
    prisma.network.count(),
    prisma.telegramMessage.count({ where: { reviewStatus: "pending" } }),
    prisma.placement.count({ where: { status: "требует проверки" } }),
    prisma.placement.findMany({
      where: { plannedAt: { gte: today, lte: weekEnd } },
      include: { channel: true, network: true, manager: true },
      orderBy: { plannedAt: "asc" },
      take: 12,
    }),
    prisma.placement.findMany({
      include: { channel: true, network: true, manager: true },
      orderBy: { plannedAt: "desc" },
      take: 12,
    }),
    prisma.placement.groupBy({ by: ["status"], _count: true }),
    prisma.invoice.groupBy({ by: ["status"], _count: true, _sum: { amountRub: true } }),
  ]);

  return {
    placementsTotal,
    channelsTotal,
    networksTotal,
    pendingTelegram,
    requiresCheck,
    upcoming,
    recentPlacements,
    statusGroups,
    financeGroups,
  };
}

export async function getPlacements(params?: {
  status?: string;
  platform?: string;
  query?: string;
}) {
  const query = params?.query?.trim();
  return prisma.placement.findMany({
    where: {
      status: params?.status || undefined,
      platform: params?.platform || undefined,
      OR: query
        ? [
            { channel: { name: { contains: query } } },
            { network: { name: { contains: query } } },
            { manager: { name: { contains: query } } },
            { note: { contains: query } },
          ]
        : undefined,
    },
    include: { channel: true, network: true, manager: true, proofs: true, payments: true },
    orderBy: [{ plannedAt: "asc" }, { createdAt: "desc" }],
    take: 300,
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
