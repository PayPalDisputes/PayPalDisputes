import { evidencePackFor, evidencePackName } from "@/lib/evidence-pack";

/**
 * Preview of the PDF evidence pack Kaleshi attaches when a seller approves "fight".
 * Built on request from the stored dispute and never saved. It shows the same order and shipping
 * details as the dispute page itself, so it's no more exposed than that page.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/disputes/[id]/evidence-pack">) {
  const { id } = await ctx.params;
  const pdf = await evidencePackFor(id);
  if (!pdf) return new Response("Dispute not found", { status: 404 });
  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${evidencePackName(id)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
