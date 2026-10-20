"use server";

import { refresh } from "next/cache";
import { canAccessDispute } from "@/lib/auth";
import { loadChat, sendChatMessage, type SendResult } from "@/lib/chat";
import { getSession } from "@/lib/session";

// Server Actions for "Ask Sira". Callable directly, so each checks the session and dispute access itself.

const NO_ACCESS = "You can't chat about this dispute.";

export async function getChat(disputeId: string) {
  const session = await getSession();
  if (!session || !(await canAccessDispute(disputeId))) return null;
  return loadChat(disputeId, session);
}

export async function askSira(disputeId: string, conversationId: string | null, text: string): Promise<SendResult> {
  const session = await getSession();
  if (!session || !(await canAccessDispute(disputeId))) return { ok: false, error: NO_ACCESS };
  if (typeof text !== "string" || (conversationId !== null && typeof conversationId !== "string")) return { ok: false, error: "Invalid message." };
  try {
    const result = await sendChatMessage(disputeId, session, conversationId, text);
    if (result.ok && result.saved) refresh(); // the report's drafts changed
    return result;
  } catch (err) {
    console.error("[chat] failed", err);
    return { ok: false, error: "Sira couldn't answer just now. Try again in a moment." };
  }
}
