import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { writeAuditLog } from "@/lib/ads/audit";
import { formString, redirectBack } from "@/lib/ads/forms";
import { saveUpload } from "@/lib/ads/files";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("file");
  const filePath = file instanceof File && file.size > 0 ? await saveUpload(file, "proofs") : null;
  const proof = await prisma.placementProof.create({
    data: {
      placementId: id,
      kind: formString(form, "kind") ?? (filePath ? "file" : "link"),
      url: formString(form, "url"),
      filePath,
      note: formString(form, "note"),
    },
  });
  await writeAuditLog({ actorId: user.id, action: "add_placement_proof", entity: "PlacementProof", entityId: proof.id, after: proof });
  return NextResponse.redirect(redirectBack(request, `/ads/placements`), { status: 303 });
}
