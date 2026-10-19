import "server-only";
import { redirect } from "next/navigation";
import { actionsMode, type ActionsMode } from "@/lib/respond";
import { getSession, type Session } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

// Authorization checks (the "data access layer"): pages, Server Actions and route handlers all
// go through these, because Server Actions and routes can be called directly, not only via the UI.

/** The session, or a redirect to the sign-in page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/signin");
  return session;
}

/** Live/demo for this session: the demo account is always demo, so it can never send anything real. */
export function sessionMode(session: Session | null): ActionsMode {
  return session?.kind === "seller" ? actionsMode() : "demo";
}

/** The seller a session is limited to; undefined means every seller (the demo account). */
export function sellerScope(session: Session): string | undefined {
  return session.kind === "seller" ? session.sellerId : undefined;
}

/** Whether a session may see or act on a dispute belonging to `sellerId`. */
export function canAccessSeller(session: Session | null, sellerId: string | null): boolean {
  if (!session) return false;
  return session.kind === "demo" || (!!sellerId && session.sellerId === sellerId);
}

/** Whether the current session may see or act on this dispute. */
export async function canAccessDispute(disputeId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  if (session.kind === "demo") return true;
  const { data, error } = await supabaseAdmin().from("disputes").select("seller_id").eq("id", disputeId).maybeSingle();
  if (error) throw error;
  return canAccessSeller(session, data?.seller_id ?? null);
}

/** Whether the current session may act on this decision (via the dispute it belongs to). */
export async function canAccessDecision(decisionId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().from("decisions").select("dispute_id").eq("id", decisionId).maybeSingle();
  if (error) throw error;
  return !!data && canAccessDispute(data.dispute_id);
}
