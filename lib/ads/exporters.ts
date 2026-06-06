import { createRequire } from "node:module";
import { prisma } from "./db";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");
const PDFKitModule = require("pdfkit") as { default?: typeof import("pdfkit") } & typeof import("pdfkit");
const PDFDocument = PDFKitModule.default ?? PDFKitModule;

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "";
}

export async function buildAdsExcelExport() {
  const [placements, channels, networks, invoices, payments] = await Promise.all([
    prisma.placement.findMany({
      include: { channel: true, network: true, manager: true, proofs: true },
      orderBy: { plannedAt: "asc" },
    }),
    prisma.channel.findMany({ include: { network: true }, orderBy: { name: "asc" } }),
    prisma.network.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.payment.findMany({ include: { invoice: true, network: true }, orderBy: { paidAt: "desc" } }),
  ]) as [
    Array<{
      plannedAt: Date | null;
      actualAt: Date | null;
      platform: string;
      network: { name: string } | null;
      channel: { name: string; url: string | null };
      manager: { name: string } | null;
      format: string | null;
      priceRub: number | null;
      status: string;
      postUrl: string | null;
      referralUrl: string | null;
      note: string | null;
      sourceSheet: string | null;
      sourceRow: number | null;
    }>,
    Array<{
      platform: string;
      network: { name: string } | null;
      name: string;
      url: string | null;
      statsUrl: string | null;
      source: string | null;
    }>,
    Array<{
      platform: string;
      name: string;
      priceRub: number | null;
      format: string | null;
      compositionStatus: string;
      networkUrl: string | null;
      source: string | null;
    }>,
    Array<{
      number: string | null;
      issuedAt: Date | null;
      contractor: string | null;
      amountRub: number | null;
      status: string;
      filePath: string | null;
      note: string | null;
    }>,
    Array<{
      paidAt: Date | null;
      amountRub: number;
      method: string | null;
      status: string;
      invoice: { number: string | null } | null;
      network: { name: string } | null;
      note: string | null;
    }>,
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      placements.map((placement) => ({
        Дата: formatDate(placement.plannedAt),
        Факт: formatDate(placement.actualAt),
        Платформа: placement.platform,
        Сетка: placement.network?.name ?? "",
        Канал: placement.channel.name,
        Ссылка: placement.channel.url ?? "",
        Менеджер: placement.manager?.name ?? "",
        Формат: placement.format ?? "",
        Цена: placement.priceRub ?? "",
        Статус: placement.status,
        "Ссылка поста": placement.postUrl ?? "",
        Рефка: placement.referralUrl ?? "",
        Примечание: placement.note ?? "",
        "Источник лист": placement.sourceSheet ?? "",
        "Источник строка": placement.sourceRow ?? "",
      })),
    ),
    "Размещения",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      channels.map((channel) => ({
        Платформа: channel.platform,
        Сетка: channel.network?.name ?? "",
        Канал: channel.name,
        Ссылка: channel.url ?? "",
        "Статистика": channel.statsUrl ?? "",
        Источник: channel.source ?? "",
      })),
    ),
    "Каналы",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      networks.map((network) => ({
        Платформа: network.platform,
        Сетка: network.name,
        Цена: network.priceRub ?? "",
        Формат: network.format ?? "",
        "Статус состава": network.compositionStatus,
        Ссылка: network.networkUrl ?? "",
        Источник: network.source ?? "",
      })),
    ),
    "Сетки",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      invoices.map((invoice) => ({
        Номер: invoice.number ?? "",
        Дата: formatDate(invoice.issuedAt),
        Контрагент: invoice.contractor ?? "",
        Сумма: invoice.amountRub ?? "",
        Статус: invoice.status,
        Файл: invoice.filePath ?? "",
        Примечание: invoice.note ?? "",
      })),
    ),
    "Счета",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      payments.map((payment) => ({
        Дата: formatDate(payment.paidAt),
        Сумма: payment.amountRub,
        Метод: payment.method ?? "",
        Статус: payment.status,
        Счет: payment.invoice?.number ?? "",
        Сетка: payment.network?.name ?? "",
        Примечание: payment.note ?? "",
      })),
    ),
    "Оплаты",
  );

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function buildClientPdfReport() {
  const placements = await prisma.placement.findMany({
    include: { channel: true, network: true, proofs: true },
    orderBy: { plannedAt: "asc" },
    take: 500,
  });

  const doc = new PDFDocument({ margin: 42, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  doc.fontSize(18).text("Отчёт по рекламным размещениям", { continued: false });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#555").text(`Сформировано: ${formatDate(new Date())}`);
  doc.moveDown(1);

  for (const placement of placements) {
    doc
      .fillColor("#111")
      .fontSize(11)
      .text(`${formatDate(placement.plannedAt)} | ${placement.platform} | ${placement.channel.name}`);
    doc
      .fontSize(9)
      .fillColor("#444")
      .text(`Сетка: ${placement.network?.name ?? "-"} | Статус: ${placement.status}`);
    if (placement.postUrl) doc.text(`Пост: ${placement.postUrl}`);
    if (placement.proofs.length) doc.text(`Подтверждений: ${placement.proofs.length}`);
    doc.moveDown(0.6);
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}
