import { buildAdsExcelExport } from "@/lib/ads/exporters";
import { requireUser } from "@/lib/ads/auth";

export const runtime = "nodejs";

export async function GET() {
  await requireUser();
  const buffer = await buildAdsExcelExport();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ads-ledger-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
