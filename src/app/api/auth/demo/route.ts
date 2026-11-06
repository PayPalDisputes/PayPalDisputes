import { randomUUID } from "node:crypto";
import { createSession, getSession } from "@/lib/session";

/**
 * "Try the demo": a read-only look at every demo store. Demo mode means approvals never reach PayPal.
 * A returning demo visitor keeps their demoId, so going through the sign-in page keeps their chat history.
 */
export async function GET(request: Request) {
  const session = await getSession();
  await createSession({ kind: "demo", demoId: session?.kind === "demo" ? session.demoId : randomUUID() });
  return Response.redirect(new URL("/dashboard", request.url), 303);
}
