import { buildClientPdfReport } from "@/lib/ads/exporters";
import { requireUser } from "@/lib/ads/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();
    const buffer = await buildClientPdfReport();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ads-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
}
