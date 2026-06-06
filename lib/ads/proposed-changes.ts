import { prisma } from "./db";
import { writeAuditLog } from "./audit";
import { normalizeChannelName, normalizeUrl, parseRub, parseSheetDate, detectPlatform } from "./normalize";

type TelegramPayload = {
  text?: string | null;
  date?: string | null;
  channelName?: string | null;
  channelUrl?: string | null;
  postUrl?: string | null;
  priceRub?: number | null;
  invoiceNumber?: string | null;
  amountRub?: number | null;
};

export function extractTelegramPayload(text: string | null | undefined): TelegramPayload {
  const raw = text ?? "";
  const urls = [...raw.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => normalizeUrl(match[0])).filter(Boolean) as string[];
  const date = raw.match(/\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?(?:\s+\d{1,2}:\d{2})?/)?.[0] ?? null;
  const amount = parseRub(raw.match(/(?:\d[\d\s.,]*)\s*(?:₽|руб|р\b)/i)?.[0] ?? null);
  const channelHandle = raw.match(/(?:@|t\.me\/)([a-zA-Z0-9_]+)/)?.[1] ?? null;
  return {
    text: raw,
    date,
    channelName: channelHandle,
    channelUrl: urls.find((url) => url.includes("t.me/") || url.includes("max.ru/")) ?? null,
    postUrl: urls[0] ?? null,
    priceRub: amount,
    invoiceNumber: raw.match(/(?:сч[её]т|№)\s*([A-Za-zА-Яа-я0-9_-]+)/i)?.[1] ?? null,
    amountRub: amount,
  };
}

export function inferProposedActions(payload: TelegramPayload) {
  const actions: Array<{ actionType: string; confidence: number; reason?: string }> = [];
  if (payload.channelUrl || payload.channelName) actions.push({ actionType: "create_channel", confidence: 0.74 });
  if (payload.date && (payload.channelUrl || payload.channelName)) actions.push({ actionType: "create_placement", confidence: 0.68 });
  if (payload.postUrl) actions.push({ actionType: "add_placement_proof", confidence: 0.62 });
  if (payload.text?.match(/выш|отчет|отчёт/i)) actions.push({ actionType: "update_placement_status", confidence: 0.58 });
  if (payload.text?.match(/сч[её]т|оплат/i) || payload.invoiceNumber) actions.push({ actionType: "attach_invoice", confidence: 0.65 });
  if (!actions.length) actions.push({ actionType: "ignore", confidence: 0.2, reason: "Авторазбор не нашёл дату, канал, ссылку или счёт" });
  return actions;
}

export async function ensureProposedChangesForTelegramMessage(messageId: string, actorId?: string | null) {
  const message = await prisma.telegramMessage.findUnique({
    where: { id: messageId },
    include: { proposedChanges: true },
  });
  if (!message || message.proposedChanges.length) return;

  const payload = extractTelegramPayload(message.text);
  const actions = inferProposedActions(payload);
  for (const action of actions) {
    await prisma.proposedChange.create({
      data: {
        sourceType: "telegram",
        sourceId: message.id,
        telegramMessageId: message.id,
        actionType: action.actionType,
        status: action.reason ? "needs_review" : "pending",
        payloadJson: JSON.stringify(payload),
        confidence: action.confidence,
        requiresCheckReason: action.reason ?? null,
        createdById: actorId ?? null,
      },
    });
  }
}

export async function applyProposedChange(changeId: string, actorId: string) {
  const change = await prisma.proposedChange.findUnique({
    where: { id: changeId },
    include: { telegramMessage: true },
  });
  if (!change) throw new Error("Proposed change not found");
  if (change.status === "applied" || change.status === "ignored") return change;

  const payload = JSON.parse(change.payloadJson || "{}") as TelegramPayload;
  let entity = "ProposedChange";
  let entityId: string | null = change.id;
  let before: unknown = null;
  let after: any = null;

  if (change.actionType === "ignore") {
    after = await prisma.proposedChange.update({
      where: { id: change.id },
      data: { status: "ignored", approvedById: actorId, appliedAt: new Date() },
    });
  } else if (change.actionType === "create_channel") {
    if (!payload.channelName && !payload.channelUrl) throw new Error("Недостаточно данных для канала");
    const platform = detectPlatform(payload.channelUrl ?? payload.channelName);
    const normalizedName = normalizeChannelName(payload.channelName ?? payload.channelUrl);
    const channelUrl = normalizeUrl(payload.channelUrl);
    const channelOr = [{ normalizedName }, ...(channelUrl ? [{ url: channelUrl }] : [])];
    const existing = await prisma.channel.findFirst({
      where: { platform, OR: channelOr },
    });
    after =
      existing ??
      (await prisma.channel.create({
        data: {
          name: payload.channelName || payload.channelUrl || "Канал требует проверки",
          normalizedName,
          platform,
          url: channelUrl,
          source: `telegram:${change.telegramMessageId ?? change.sourceId ?? change.id}`,
        },
      }));
    entity = "Channel";
    entityId = after.id;
  } else if (change.actionType === "create_placement") {
    if (!payload.date || (!payload.channelName && !payload.channelUrl)) throw new Error("Недостаточно данных для размещения");
    const platform = detectPlatform(payload.channelUrl ?? payload.channelName);
    const normalizedName = normalizeChannelName(payload.channelName ?? payload.channelUrl);
    const channelUrl = normalizeUrl(payload.channelUrl);
    const channelOr = [{ normalizedName }, ...(channelUrl ? [{ url: channelUrl }] : [])];
    const channel =
      (await prisma.channel.findFirst({ where: { platform, OR: channelOr } })) ??
      (await prisma.channel.create({
        data: {
          name: payload.channelName || payload.channelUrl || "Канал требует проверки",
          normalizedName,
          platform,
          url: channelUrl,
          source: `telegram:${change.telegramMessageId ?? change.id}`,
        },
      }));
    const plannedAt = parseSheetDate(payload.date);
    const existing = await prisma.placement.findFirst({ where: { channelId: channel.id, plannedAt, platform } });
    after =
      existing ??
      (await prisma.placement.create({
        data: {
          channelId: channel.id,
          platform,
          plannedAt,
          priceRub: payload.priceRub ?? null,
          status: plannedAt ? "запланировано" : "требует проверки",
          postUrl: normalizeUrl(payload.postUrl),
          note: `Создано из Telegram${change.telegramMessage ? `: ${change.telegramMessage.telegramMessageId}` : ""}`,
        },
      }));
    entity = "Placement";
    entityId = after.id;
  } else if (change.actionType === "add_placement_proof" || change.actionType === "update_placement_status") {
    const postUrl = normalizeUrl(payload.postUrl);
    const placement = postUrl
      ? await prisma.placement.findFirst({ where: { OR: [{ postUrl }, { channel: { url: normalizeUrl(payload.channelUrl) ?? undefined } }] } })
      : null;
    if (!placement) throw new Error("Не найдено размещение для proof/status");
    before = placement;
    if (change.actionType === "add_placement_proof") {
      after = await prisma.placementProof.create({
        data: { placementId: placement.id, kind: "link", url: postUrl, note: "Из Telegram" },
      });
      entity = "PlacementProof";
      entityId = after.id;
    } else {
      after = await prisma.placement.update({
        where: { id: placement.id },
        data: { status: "вышло", actualAt: new Date(), postUrl: placement.postUrl ?? postUrl },
      });
      entity = "Placement";
      entityId = after.id;
    }
  } else if (change.actionType === "attach_invoice") {
    after = await prisma.invoice.create({
      data: {
        number: payload.invoiceNumber ?? null,
        amountRub: payload.amountRub ?? null,
        status: "счёт получен",
        note: `Из Telegram${change.telegramMessage ? `: ${change.telegramMessage.telegramMessageId}` : ""}`,
      },
    });
    entity = "Invoice";
    entityId = after.id;
  }

  const updated = await prisma.proposedChange.update({
    where: { id: change.id },
    data: { status: "applied", approvedById: actorId, appliedAt: new Date() },
  });
  await writeAuditLog({ actorId, action: `apply_${change.actionType}`, entity, entityId, before, after });
  return updated;
}
