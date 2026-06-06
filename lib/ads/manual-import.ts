import { prisma } from "./db";
import { ensureCampaignFoundation } from "./campaigns";
import { bulkCreatePlacements, createPlacement } from "./placements-service";
import { detectPlatform, normalizeChannelName, normalizeText, normalizeUrl, parseSheetDate } from "./normalize";

type CampaignOption = {
  id: string;
  name: string;
};

type ImportContext = {
  campaigns: CampaignOption[];
  existingChannels: Array<{ id: string; name: string; platform: string; url: string | null }>;
  existingManagers: Array<{ id: string; name: string }>;
};

type ParsedImportEntry = {
  rawLine: string;
  campaignId: string;
  campaignName: string;
  plannedAtIso: string;
  channelName: string;
  managerName: string | null;
  status: string;
  note: string | null;
  postUrl: string | null;
  channelUrl: string | null;
  proofUrl: string | null;
  proofNote: string | null;
  platform: string;
  createChannel: boolean;
  createManager: boolean;
  warnings: string[];
  blockingIssues: string[];
  canSave: boolean;
};

type ParseOptions = {
  campaignId: string;
  plannedAt: string;
  channelName: string;
  managerName?: string;
  status?: string;
  link?: string;
  proof?: string;
  note?: string;
};

export async function getManualImportContext() {
  const defaultCampaign = await ensureCampaignFoundation();
  const [campaigns, existingChannels, existingManagers] = await Promise.all([
    prisma.campaign.findMany({
      select: { id: true, name: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.channel.findMany({
      select: { id: true, name: true, platform: true, url: true },
      orderBy: { name: "asc" },
      take: 2000,
    }),
    prisma.manager.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 1000,
    }),
  ]);

  return {
    defaultCampaign,
    campaigns,
    existingChannels,
    existingManagers,
  };
}

function buildContextMaps(context: ImportContext) {
  const channelByUrl = new Map<string, { id: string; name: string; platform: string; url: string | null }>();
  const channelByName = new Map<string, { id: string; name: string; platform: string; url: string | null }>();
  for (const channel of context.existingChannels) {
    if (channel.url) channelByUrl.set(channel.url, channel);
    channelByName.set(`${channel.platform}:${normalizeChannelName(channel.name)}`, channel);
  }

  const managerByName = new Map<string, { id: string; name: string }>();
  for (const manager of context.existingManagers) {
    managerByName.set(normalizeText(manager.name), manager);
  }

  return { channelByUrl, channelByName, managerByName };
}

function normalizeStatus(value: string) {
  const raw = normalizeText(value);
  if (!raw) return "запланировано";
  if (raw.includes("не выш")) return "не вышло";
  if (raw.includes("выш")) return "вышло";
  if (raw.includes("жд") || raw.includes("отчет")) return "ждём отчёт";
  if (raw.includes("проверк")) return "требует проверки";
  if (raw.includes("отмен")) return "отмена";
  if (raw.includes("перен")) return "перенос";
  return value.trim();
}

function splitPlacementLink(value: string | null) {
  const normalized = normalizeUrl(value);
  if (!normalized) return { channelUrl: null, postUrl: null };

  if (/https:\/\/t\.me\/[^/]+\/\d+/i.test(normalized) || /https:\/\/max\.ru\/[^/]+\/\d+/i.test(normalized)) {
    return { channelUrl: null, postUrl: normalized };
  }

  return { channelUrl: normalized, postUrl: null };
}

function parseProofValue(value: string) {
  const normalized = normalizeUrl(value);
  if (normalized) return { proofUrl: normalized, proofNote: null, warnings: [] as string[] };

  const raw = normalizeText(value);
  if (!raw) return { proofUrl: null, proofNote: null, warnings: [] as string[] };
  if (raw.includes("proof") || raw.includes("подтверж")) {
    return {
      proofUrl: null,
      proofNote: value.trim(),
      warnings: ["proof отмечен без ссылки"],
    };
  }

  return {
    proofUrl: null,
    proofNote: value.trim(),
    warnings: ["поле proof не похоже на ссылку"],
  };
}

function resolveCampaign(campaignId: string, campaigns: CampaignOption[]) {
  const campaign = campaigns.find((item) => item.id === campaignId) ?? campaigns[0] ?? null;
  return campaign;
}

function buildEntry(options: ParseOptions, context: ImportContext): ParsedImportEntry {
  const { channelByUrl, channelByName, managerByName } = buildContextMaps(context);
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const campaign = resolveCampaign(options.campaignId, context.campaigns);

  if (!campaign) {
    blockingIssues.push("кампания не выбрана");
  }

  const plannedAt = parseSheetDate(options.plannedAt);
  if (!plannedAt) blockingIssues.push("не распознана дата");

  const channelName = options.channelName.trim();
  if (!channelName) blockingIssues.push("не указан канал");

  const status = normalizeStatus(options.status?.trim() ?? "");
  if (!status) warnings.push("статус пустой");

  const managerName = options.managerName?.trim() ? options.managerName.trim() : null;
  const proofData = parseProofValue(options.proof?.trim() ?? "");
  warnings.push(...proofData.warnings);

  const linkData = splitPlacementLink(options.link?.trim() ?? null);
  const channelUrl = linkData.channelUrl;
  const postUrl = linkData.postUrl;
  const platform = detectPlatform(channelUrl ?? postUrl ?? channelName);
  const existingChannel =
    (channelUrl ? channelByUrl.get(channelUrl) : null) ??
    channelByName.get(`${platform}:${normalizeChannelName(channelName)}`) ??
    null;
  const existingManager = managerName ? managerByName.get(normalizeText(managerName)) ?? null : null;

  return {
    rawLine: options.note?.trim() ? `${channelName} · ${options.note.trim()}` : channelName,
    campaignId: campaign?.id ?? "",
    campaignName: campaign?.name ?? "—",
    plannedAtIso: plannedAt ? plannedAt.toISOString() : "",
    channelName,
    managerName,
    status: status || "запланировано",
    note: options.note?.trim() ? options.note.trim() : null,
    postUrl,
    channelUrl,
    proofUrl: proofData.proofUrl,
    proofNote: proofData.proofNote,
    platform,
    createChannel: !existingChannel,
    createManager: Boolean(managerName && !existingManager),
    warnings,
    blockingIssues,
    canSave: blockingIssues.length === 0,
  };
}

export function buildSingleImportPreview(options: ParseOptions, context: ImportContext) {
  return buildEntry(options, context);
}

export function parseBulkImportText(
  bulkText: string,
  campaignId: string,
  context: ImportContext,
) {
  const lines = bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split(/\s*[—–;]\s*|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    const warnings: string[] = [];
    if (parts.length < 2) {
      return {
        rawLine: line,
        campaignId,
        campaignName: resolveCampaign(campaignId, context.campaigns)?.name ?? "—",
        plannedAtIso: "",
        channelName: "",
        managerName: null,
        status: "",
        note: null,
        postUrl: null,
        channelUrl: null,
        proofUrl: null,
        proofNote: null,
        platform: "TG",
        createChannel: false,
        createManager: false,
        warnings,
        blockingIssues: ["строка не распознана"],
        canSave: false,
      } satisfies ParsedImportEntry;
    }

    const [datePart, channelPart, ...rest] = parts;
    let managerName = "";
    let status = "";
    let note = "";
    let link = "";
    let proof = "";

    for (const part of rest) {
      const lowered = normalizeText(part);
      const normalized = normalizeUrl(part);
      if (!status && (lowered.includes("выш") || lowered.includes("жд") || lowered.includes("проверк") || lowered.includes("отмен") || lowered.includes("перен"))) {
        status = part;
        continue;
      }
      if (!proof && (lowered.includes("proof") || lowered.includes("подтверж"))) {
        proof = part;
        continue;
      }
      if (!link && normalized) {
        link = normalized;
        continue;
      }
      if (!managerName && (lowered.startsWith("менеджер ") || !lowered.includes("proof"))) {
        managerName = part.replace(/^менеджер\s+/i, "").trim();
        continue;
      }
      note = note ? `${note} | ${part}` : part;
    }

    return buildEntry(
      {
        campaignId,
        plannedAt: datePart,
        channelName: channelPart,
        managerName,
        status,
        link,
        proof,
        note: note || line,
      },
      context,
    );
  });
}

type SaveEntryInput = Omit<ParsedImportEntry, "createChannel" | "createManager" | "warnings" | "blockingIssues" | "canSave">;

async function resolveChannel(entry: SaveEntryInput) {
  const existing =
    (entry.channelUrl
      ? await prisma.channel.findFirst({
          where: { url: entry.channelUrl },
        })
      : null) ??
    (await prisma.channel.findFirst({
      where: {
        platform: entry.platform,
        normalizedName: normalizeChannelName(entry.channelName),
      },
    }));

  if (existing) {
    if (entry.channelUrl && !existing.url) {
      return prisma.channel.update({
        where: { id: existing.id },
        data: { url: entry.channelUrl },
      });
    }
    return existing;
  }

  return prisma.channel.create({
    data: {
      name: entry.channelName,
      normalizedName: normalizeChannelName(entry.channelName),
      platform: entry.platform,
      url: entry.channelUrl,
      source: "manual import",
    },
  });
}

async function resolveManager(name: string | null) {
  if (!name) return null;
  return prisma.manager.upsert({
    where: { name },
    update: {},
    create: { name, source: "manual import" },
  });
}

export async function saveManualImportEntries(entries: SaveEntryInput[]) {
  await ensureCampaignFoundation();
  if (entries.length === 1) {
    const [entry] = entries;
    if (!entry.campaignId || !entry.channelName || !entry.plannedAtIso) {
      return { savedCount: 0 };
    }
    await createPlacement({
      campaignId: entry.campaignId,
      plannedAt: entry.plannedAtIso,
      platform: entry.platform,
      channelName: entry.channelName,
      channelUrl: entry.channelUrl,
      managerName: entry.managerName,
      priceRub: null,
      status: entry.status,
      postUrl: entry.postUrl,
      note: entry.note,
    });
    return { savedCount: 1 };
  }

  const result = await bulkCreatePlacements({
    rows: entries.map((entry) => ({
      plannedAt: entry.plannedAtIso,
      platform: entry.platform,
      channelName: entry.channelName,
      channelUrl: entry.channelUrl,
      managerName: entry.managerName,
      status: entry.status,
      postUrl: entry.postUrl,
      note: entry.note,
      proofUrl: entry.proofUrl,
      proofNote: entry.proofNote,
    })),
  });

  return { savedCount: result.created };
}
