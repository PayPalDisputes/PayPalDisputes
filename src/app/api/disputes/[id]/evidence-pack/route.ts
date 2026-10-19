import { canAccessDispute } from "@/lib/auth";
import { evidencePackFor, evidencePackName } from "@/lib/evidence-pack";

/**
 * Preview of the PDF evidence pack Kaleshi attaches when a seller approves "fight".
 * Built on request from the stored dispute and never saved. Only for a signed-in session that may
 * see the dispute, since it includes the buyer's shipping address.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/disputes/[id]/evidence-pack">) {
  const { id } = await ctx.params;
  if (!(await canAccessDispute(id))) return new Response("Not found", { status: 404 });
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
