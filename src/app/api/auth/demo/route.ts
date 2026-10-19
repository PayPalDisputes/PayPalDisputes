import { createSession } from "@/lib/session";

/** "Try the demo": a read-only look at every demo store. Demo mode means approvals never reach PayPal. */
export async function GET(request: Request) {
  await createSession({ kind: "demo" });
  return Response.redirect(new URL("/dashboard", request.url), 303);
}
