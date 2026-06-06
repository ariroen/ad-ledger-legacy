import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const prisma = new PrismaClient();
const workbookPath =
  process.env.ADS_SOURCE_WORKBOOK ||
  "/Users/UserOne/Documents/New project 2/outputs/daily_ad_screens/Закупка рекламы Май Обнова 1 (1)_updated_2026-06-02_2026-06-04.xlsx";
const telegramPath =
  process.env.ADS_TELEGRAM_JSONL ||
  "/Users/UserOne/Documents/New project 2/outputs/telegram_inbox/messages.jsonl";

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").replace(/^@/, "").toLowerCase();
}

function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("@")) return `https://t.me/${raw.slice(1)}`;
  if (/^t\.me\//i.test(raw) || /^max\.ru\//i.test(raw)) return `https://${raw}`;
  return raw.split("?")[0].replace(/\/+$/, "");
}

function platform(value) {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("max") || raw.includes("макс")) return "MAX";
  if (raw.includes("vk") || raw.includes("вк")) return "VK";
  return "TG";
}

function rub(value) {
  if (typeof value === "number") return Math.round(value);
  const match = String(value ?? "").replace(/\s/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function field(row, names) {
  for (const key of Object.keys(row)) {
    if (names.some((name) => normalizeText(name) === normalizeText(key))) return row[key];
  }
  return null;
}

async function network(name, platformName, source) {
  const finalName = String(name || "Сетка требует проверки").trim();
  return prisma.network.upsert({
    where: { name_platform: { name: finalName, platform: platformName } },
    update: {},
    create: { name: finalName, platform: platformName, source },
  });
}

async function channel(row, networkId, source) {
  const url = normalizeUrl(field(row, ["Ссылка", "URL", "Channel link", "Ссылка канала"]));
  const name = String(field(row, ["Канал", "Channel", "Название", "Телеграм", "MAX"]) || url || "Канал требует проверки").trim();
  const platformName = platform(field(row, ["Платформа", "Platform", "Ссылка"]) || url);
  const normalizedName = normalizeText(name || url);
  const existing =
    (url ? await prisma.channel.findFirst({ where: { platform: platformName, url } }) : null) ||
    (await prisma.channel.findFirst({ where: { platform: platformName, normalizedName } }));
  if (existing) return existing;
  return prisma.channel.create({
    data: { name, normalizedName, platform: platformName, url, networkId, source },
  });
}

let networks = 0;
let channels = 0;
let placements = 0;
let telegram = 0;

if (fs.existsSync(workbookPath)) {
  const book = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = book.Sheets["Сетки каналов"];
  if (sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    for (const [index, row] of rows.entries()) {
      const platformName = platform(field(row, ["Платформа", "Platform", "Ссылка"]));
      const net = await network(field(row, ["Сетка", "Network", "Название сетки"]), platformName, "Excel: Сетки каналов");
      const before = await prisma.channel.count();
      await channel(row, net.id, `Excel:${path.basename(workbookPath)}:Сетки каналов:${index + 2}`);
      const after = await prisma.channel.count();
      if (after > before) channels += 1;
      networks += 1;
    }
  }
}

if (fs.existsSync(telegramPath)) {
  for (const line of fs.readFileSync(telegramPath, "utf8").split("\n").filter(Boolean)) {
    try {
      const message = JSON.parse(line);
      const telegramMessageId = Number(message.message_id ?? message.id);
      const chatId = String(message.chat_id ?? message.chat?.id ?? "unknown");
      if (!telegramMessageId) continue;
      const existing = await prisma.telegramMessage.findUnique({
        where: { telegramMessageId_chatId: { telegramMessageId, chatId } },
      });
      if (existing) continue;
      await prisma.telegramMessage.create({
        data: {
          telegramMessageId,
          chatId,
          senderName: message.sender_name ?? message.from?.first_name ?? null,
          senderUsername: message.sender_username ?? message.from?.username ?? null,
          text: String(message.text ?? message.caption ?? ""),
          receivedAt: new Date(message.date ?? Date.now()),
          rawJson: JSON.stringify(message),
          suggestedActions: JSON.stringify(["ручная проверка"]),
        },
      });
      telegram += 1;
    } catch {}
  }
}

console.log(JSON.stringify({ networksSeen: networks, channelsAdded: channels, placementsAdded: placements, telegramAdded: telegram }, null, 2));
await prisma.$disconnect();
