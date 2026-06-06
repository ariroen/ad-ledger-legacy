import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { prisma } from "./db";
import {
  detectPlatform,
  inferPostNumber,
  normalizeChannelName,
  normalizeText,
  normalizeUrl,
  parseRub,
  parseSheetDate,
} from "./normalize";
import { DEFAULT_TELEGRAM_JSONL, DEFAULT_WORKBOOK_PATH } from "./constants";
import { writeAuditLog } from "./audit";
import { createBackupSnapshot } from "./backups";
import { ensureProposedChangesForTelegramMessage } from "./proposed-changes";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

type ImportStats = {
  channelsAdded: number;
  networksAdded: number;
  placementsAdded: number;
  placementsUpdated: number;
  telegramAdded: number;
  telegramSkipped: number;
  requiresCheck: number;
  notes: string[];
};

const stats = (): ImportStats => ({
  channelsAdded: 0,
  networksAdded: 0,
  placementsAdded: 0,
  placementsUpdated: 0,
  telegramAdded: 0,
  telegramSkipped: 0,
  requiresCheck: 0,
  notes: [],
});

function value(row: Record<string, unknown>, names: string[]) {
  const keys = Object.keys(row);
  for (const wanted of names) {
    const found = keys.find((key) => normalizeText(key) === normalizeText(wanted));
    if (found) return row[found];
  }
  return null;
}

async function upsertNetwork(input: {
  name: string;
  platform: string;
  priceRub?: number | null;
  format?: string | null;
  networkUrl?: string | null;
  compositionStatus?: string;
  source?: string;
}) {
  const existing = await prisma.network.findUnique({
    where: { name_platform: { name: input.name, platform: input.platform } },
  });
  if (existing) return { network: existing, created: false };

  const network = await prisma.network.create({
    data: {
      name: input.name,
      platform: input.platform,
      priceRub: input.priceRub ?? null,
      format: input.format ?? null,
      networkUrl: input.networkUrl ?? null,
      compositionStatus: input.compositionStatus ?? "active",
      source: input.source ?? null,
    },
  });
  return { network, created: true };
}

async function upsertChannel(input: {
  name: string;
  platform: string;
  url?: string | null;
  statsUrl?: string | null;
  networkId?: string | null;
  source?: string;
}) {
  const normalizedName = normalizeChannelName(input.name || input.url);
  const url = normalizeUrl(input.url);
  const existing =
    (url
      ? await prisma.channel.findFirst({ where: { platform: input.platform, url } })
      : null) ??
    (await prisma.channel.findFirst({
      where: {
        platform: input.platform,
        normalizedName,
        networkId: input.networkId ?? undefined,
      },
    }));

  if (existing) {
    const channel = await prisma.channel.update({
      where: { id: existing.id },
      data: {
        name: existing.name || input.name,
        url: existing.url ?? url,
        statsUrl: existing.statsUrl ?? normalizeUrl(input.statsUrl),
        networkId: existing.networkId ?? input.networkId ?? null,
        source: existing.source ?? input.source ?? null,
      },
    });
    return { channel, created: false };
  }

  const channel = await prisma.channel.create({
    data: {
      name: input.name || normalizedName || "Канал требует проверки",
      normalizedName: normalizedName || normalizeText(input.url) || "unknown",
      platform: input.platform,
      url,
      statsUrl: normalizeUrl(input.statsUrl),
      networkId: input.networkId ?? null,
      source: input.source ?? null,
    },
  });
  return { channel, created: true };
}

async function upsertManager(name: unknown) {
  const normalized = String(name ?? "").trim();
  if (!normalized) return null;
  return prisma.manager.upsert({
    where: { name: normalized },
    update: {},
    create: { name: normalized, source: "excel" },
  });
}

function statusFromRow(row: Record<string, unknown>) {
  const raw = normalizeText(
    value(row, ["Статус", "Результат", "Подтверждение", "отметка", "итог"]),
  );
  if (!raw) return "запланировано";
  if (raw.includes("выш") || raw.includes("готов") || raw.includes("отчет")) return "вышло";
  if (raw.includes("перен")) return "перенос";
  if (raw.includes("отмен")) return "отмена";
  if (raw.includes("не найден") || raw.includes("нет")) return "не найдено";
  if (raw.includes("проверк") || raw.includes("уточн")) return "требует проверки";
  return "ждём выход";
}

async function upsertPlacement(input: {
  channelId: string;
  platform: string;
  plannedAt: Date | null;
  networkId?: string | null;
  managerId?: string | null;
  priceRub?: number | null;
  format?: string | null;
  status?: string;
  postNumber?: string | null;
  postUrl?: string | null;
  referralUrl?: string | null;
  note?: string | null;
  sourceFile?: string;
  sourceSheet?: string;
  sourceRow?: number;
}) {
  const existing = await prisma.placement.findFirst({
    where: {
      channelId: input.channelId,
      platform: input.platform,
      plannedAt: input.plannedAt,
      networkId: input.networkId ?? null,
      postNumber: input.postNumber ?? null,
    },
  });

  if (existing) {
    const placement = await prisma.placement.update({
      where: { id: existing.id },
      data: {
        priceRub: existing.priceRub ?? input.priceRub ?? null,
        format: existing.format ?? input.format ?? null,
        status: existing.status === "запланировано" ? input.status ?? existing.status : existing.status,
        postUrl: existing.postUrl ?? input.postUrl ?? null,
        referralUrl: existing.referralUrl ?? input.referralUrl ?? null,
        note: [existing.note, input.note].filter(Boolean).join(" | ") || null,
        managerId: existing.managerId ?? input.managerId ?? null,
      },
    });
    return { placement, created: false };
  }

  const placement = await prisma.placement.create({
    data: {
      channelId: input.channelId,
      platform: input.platform,
      plannedAt: input.plannedAt,
      networkId: input.networkId ?? null,
      managerId: input.managerId ?? null,
      priceRub: input.priceRub ?? null,
      format: input.format ?? null,
      status: input.status ?? "запланировано",
      postNumber: input.postNumber ?? null,
      postUrl: input.postUrl ?? null,
      referralUrl: input.referralUrl ?? null,
      note: input.note ?? null,
      sourceFile: input.sourceFile ?? null,
      sourceSheet: input.sourceSheet ?? null,
      sourceRow: input.sourceRow ?? null,
    },
  });
  return { placement, created: true };
}

export async function importWorkbook(workbookPath = DEFAULT_WORKBOOK_PATH, actorId?: string | null) {
  const result = stats();
  if (!fs.existsSync(workbookPath)) {
    result.notes.push(`Excel не найден: ${workbookPath}`);
    return result;
  }

  const workbook = XLSX.read(fs.readFileSync(workbookPath), { cellDates: true });
  const sourceFile = path.basename(workbookPath);

  const networksSheet = workbook.Sheets["Сетки каналов"];
  if (networksSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(networksSheet, { defval: "" });
    for (const [index, row] of rows.entries()) {
      const networkName = String(value(row, ["Сетка", "Network", "Название сетки"]) ?? "").trim();
      const channelName = String(value(row, ["Канал", "Channel", "Название"]) ?? "").trim();
      const url = normalizeUrl(value(row, ["Ссылка", "URL", "TG/Max"]));
      const platform = detectPlatform(value(row, ["Платформа", "Platform", "Ссылка"]));
      const status = String(value(row, ["Статус", "Состав"]) ?? "").trim();
      if (!networkName && !channelName && !url) continue;

      const networkResult = await upsertNetwork({
        name: networkName || "Сетка требует проверки",
        platform,
        priceRub: parseRub(value(row, ["Цена", "Стоимость"])),
        compositionStatus: status || (url ? "active" : "состав требует проверки"),
        source: "Excel: Сетки каналов",
      });
      if (networkResult.created) result.networksAdded += 1;

      if (channelName || url) {
        const channelResult = await upsertChannel({
          name: channelName || String(url),
          platform,
          url,
          networkId: networkResult.network.id,
          source: `Excel:${sourceFile}:Сетки каналов:${index + 2}`,
        });
        if (channelResult.created) result.channelsAdded += 1;
        if (!url) result.requiresCheck += 1;
      }
    }
  }

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "Сетки каналов") continue;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    for (const [index, row] of rows.entries()) {
      const plannedAt = parseSheetDate(value(row, ["Дата", "дата поста", "Дата выхода", "Выход"]));
      const channelRaw =
        value(row, ["Канал", "Название", "Телеграм", "Телега", "MAX", "Макс", "Название канала"]) ??
        value(row, ["тг канал", "канал/чат"]);
      const channelUrl = normalizeUrl(value(row, ["Ссылка", "Channel link", "Ссылка канала", "TG", "MAX link"]));
      const priceRub = parseRub(value(row, ["Цена", "Стоимость", "Прайс", "Сумма"]));
      const hasPlacementSignal = plannedAt || channelRaw || channelUrl || priceRub;
      if (!hasPlacementSignal) continue;

      const platform = detectPlatform(value(row, ["Платформа", "Platform", "Тип", "Ссылка"]) ?? channelUrl);
      const manager = await upsertManager(value(row, ["Менеджер", "Manager", "Ответственный"]));
      const networkName = String(value(row, ["Сетка", "Network", "Пакет"]) ?? "").trim();
      const network =
        networkName.length > 0
          ? await upsertNetwork({ name: networkName, platform, source: `Excel:${sheetName}` })
          : null;
      if (network?.created) result.networksAdded += 1;

      const channelResult = await upsertChannel({
        name: String(channelRaw || channelUrl || "Канал требует проверки"),
        platform,
        url: channelUrl,
        networkId: network?.network.id ?? null,
        source: `Excel:${sourceFile}:${sheetName}:${index + 2}`,
      });
      if (channelResult.created) result.channelsAdded += 1;

      const placementResult = await upsertPlacement({
        channelId: channelResult.channel.id,
        platform,
        plannedAt,
        networkId: network?.network.id ?? channelResult.channel.networkId,
        managerId: manager?.id ?? null,
        priceRub,
        format: String(value(row, ["Формат", "Format", "Тип поста"]) ?? "").trim() || null,
        status: plannedAt ? statusFromRow(row) : "требует проверки",
        postNumber: inferPostNumber(value(row, ["Пост", "№", "Номер", "Комментарий", "Примечание"])),
        postUrl: normalizeUrl(value(row, ["Ссылка поста", "Post link", "Пост", "Отчет"])),
        referralUrl: normalizeUrl(value(row, ["РЕФКА", "Refka", "Рефка", "Referral"])),
        note: String(value(row, ["Комментарий", "Примечание", "Note"]) ?? "").trim() || null,
        sourceFile,
        sourceSheet: sheetName,
        sourceRow: index + 2,
      });
      if (placementResult.created) result.placementsAdded += 1;
      else result.placementsUpdated += 1;
      if (currentImportRunId) {
        await prisma.importRunItem.create({
          data: {
            importRunId: currentImportRunId,
            entity: "Placement",
            entityId: placementResult.placement.id,
            placementId: placementResult.placement.id,
            action: placementResult.created ? "added" : "updated",
            sourceSheet: sheetName,
            sourceRow: index + 2,
            requiresCheck: !plannedAt || (!channelUrl && normalizeChannelName(channelRaw).includes("требует")),
            requiresCheckReason: !plannedAt ? "Не найдена дата выхода" : !channelUrl ? "Нет ссылки канала" : null,
          },
        });
      }
      if (!plannedAt || (!channelUrl && normalizeChannelName(channelRaw).includes("требует"))) {
        result.requiresCheck += 1;
      }
    }
  }

  await writeAuditLog({
    actorId,
    action: "import_workbook",
    entity: "Workbook",
    entityId: sourceFile,
    after: result,
  });

  return result;
}

let currentImportRunId: string | null = null;

function suggestTelegramActions(text: string) {
  const lower = text.toLowerCase();
  const actions: string[] = [];
  if (/счет|счёт|оплат|руб|₽/.test(lower)) actions.push("прикрепить счёт/оплату");
  if (/выш|ссылка|пост|отчет|отчёт|скрин/.test(lower)) actions.push("обновить статус/добавить proof");
  if (/канал|сетка|тг|telegram|max|макс/.test(lower)) actions.push("создать или обновить канал/сетку");
  if (/\d{1,2}[.\-/]\d{1,2}/.test(lower)) actions.push("создать размещение по дате");
  return actions.length ? actions : ["ручная проверка"];
}

function parseTelegramDate(message: Record<string, any>) {
  const receivedAt = message.received_at ? new Date(message.received_at) : null;
  if (receivedAt && !Number.isNaN(receivedAt.getTime())) return receivedAt;
  const rawDate = message.date;
  if (typeof rawDate === "number" && Number.isFinite(rawDate)) return new Date(rawDate * 1000);
  const parsed = parseSheetDate(rawDate);
  return parsed ?? new Date();
}

export async function importTelegramJsonl(jsonlPath = DEFAULT_TELEGRAM_JSONL, actorId?: string | null) {
  const result = stats();
  if (!fs.existsSync(jsonlPath)) {
    result.notes.push(`Telegram JSONL не найден: ${jsonlPath}`);
    return result;
  }

  const lines = fs.readFileSync(jsonlPath, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    let message: Record<string, any>;
    try {
      message = JSON.parse(line);
    } catch {
      result.requiresCheck += 1;
      continue;
    }

    const telegramMessageId = Number(message.message_id ?? message.id);
    const chatId = String(message.chat_id ?? message.chat?.id ?? "unknown");
    if (!telegramMessageId || !chatId) {
      result.requiresCheck += 1;
      continue;
    }

    const existing = await prisma.telegramMessage.findUnique({
      where: { telegramMessageId_chatId: { telegramMessageId, chatId } },
    });
    if (existing) {
      const parsedReceivedAt = parseTelegramDate(message);
      if (existing.receivedAt.getUTCFullYear() < 2020) {
        await prisma.telegramMessage.update({
          where: { id: existing.id },
          data: { receivedAt: parsedReceivedAt },
        });
      }
      await ensureProposedChangesForTelegramMessage(existing.id, actorId);
      result.telegramSkipped += 1;
      continue;
    }

    const text = String(message.text ?? message.caption ?? "").trim();
    const created = await prisma.telegramMessage.create({
      data: {
        telegramMessageId,
        chatId,
        senderName: message.from?.first_name ?? message.sender_name ?? null,
        senderUsername: message.from?.username ?? message.sender_username ?? null,
        forwardedFrom: message.forward_from_chat?.title ?? message.forwarded_from ?? null,
        text,
        receivedAt: parseTelegramDate(message),
        rawJson: JSON.stringify(message),
        suggestedActions: JSON.stringify(suggestTelegramActions(text)),
      },
    });
    result.telegramAdded += 1;
    await ensureProposedChangesForTelegramMessage(created.id, actorId);

    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    for (const attachment of attachments) {
      await prisma.attachment.create({
        data: {
          telegramMessageId: created.id,
          kind: String(attachment.kind ?? attachment.type ?? "file"),
          fileName: attachment.file_name ?? attachment.fileName ?? null,
          filePath: attachment.file_path ?? attachment.filePath ?? null,
          mimeType: attachment.mime_type ?? attachment.mimeType ?? null,
          fileId: attachment.file_id ?? attachment.fileId ?? null,
        },
      });
    }
  }

  await writeAuditLog({
    actorId,
    action: "import_telegram_jsonl",
    entity: "TelegramMessage",
    entityId: path.basename(jsonlPath),
    after: result,
  });

  return result;
}

export async function importAllAdsData(actorId?: string | null) {
  await createBackupSnapshot("before_import", "Автоматический snapshot перед массовым импортом");
  const importRun = await prisma.importRun.create({
    data: {
      source: "excel+telegram",
      status: "running",
      actorId: actorId ?? null,
    },
  });
  currentImportRunId = importRun.id;
  try {
    const workbook = await importWorkbook(DEFAULT_WORKBOOK_PATH, actorId);
    const telegram = await importTelegramJsonl(DEFAULT_TELEGRAM_JSONL, actorId);
    const addedCount = workbook.channelsAdded + workbook.networksAdded + workbook.placementsAdded + telegram.telegramAdded;
    const updatedCount = workbook.placementsUpdated;
    const skippedCount = telegram.telegramSkipped;
    const requiresCheckCount = workbook.requiresCheck + telegram.requiresCheck;
    const updatedRun = await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: "completed",
        addedCount,
        updatedCount,
        skippedCount,
        requiresCheckCount,
        errorCount: workbook.notes.length + telegram.notes.length,
        summaryJson: JSON.stringify({ workbook, telegram }),
      },
    });
    return { workbook, telegram, importRun: updatedRun };
  } catch (error) {
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: "failed",
        errorCount: 1,
        summaryJson: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      },
    });
    throw error;
  } finally {
    currentImportRunId = null;
  }
}
