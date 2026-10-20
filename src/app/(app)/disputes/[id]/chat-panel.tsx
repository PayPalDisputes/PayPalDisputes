"use client";

import { useRef, useState, useTransition } from "react";
import type { ChatMessage, DraftPreview } from "@/lib/chat";
import { DRAFT_LABELS } from "@/app/_components/dispute-ui";
import { askSira, getChat } from "./chat-actions";

const SUGGESTIONS = ["Why this recommendation?", "Make the draft friendlier", "Make it shorter", "What if I refund instead?"];
const MAX = 1000; // matches MAX_MESSAGE_CHARS on the server

type Loaded = Awaited<ReturnType<typeof getChat>>;
type Turn = ChatMessage & { preview?: DraftPreview[] | null; saved?: boolean };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "Ask Sira": chat about this dispute. Only ever changes drafts; sending still needs Approve. */
export function ChatPanel({ disputeId }: { disputeId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [resumeChoice, setResumeChoice] = useState<"continue" | "fresh" | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    setOpen(true);
    if (loaded !== undefined) return;
    start(async () => {
      const chat = await getChat(disputeId);
      setLoaded(chat);
      if (!chat?.conversationId) setResumeChoice("fresh");
    });
  }

  function resume(choice: "continue" | "fresh") {
    setResumeChoice(choice);
    if (choice === "continue" && loaded?.conversationId) {
      setConversationId(loaded.conversationId);
      setTurns(loaded.messages);
    } else {
      setConversationId(null);
      setTurns([]);
    }
  }

  function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setError(null);
    setText("");
    setTurns((t) => [...t, { role: "seller", content: trimmed, createdAt: new Date().toISOString() }]);
    start(async () => {
      const res = await askSira(disputeId, conversationId, trimmed);
      if (!res.ok) {
        setError(res.error);
        setTurns((t) => t.slice(0, -1));
        setText(trimmed);
        return;
      }
      setConversationId(res.conversationId);
      setTurns((t) => [...t, { ...res.reply, preview: res.saved ? null : res.revisedDrafts, saved: res.saved }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest" }));
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        💬 Ask Sira about this dispute
      </button>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 text-sm dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span className="font-medium">Ask Sira</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          Close
        </button>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto px-3 py-3">
        {loaded === undefined && <p className="text-zinc-500">Loading…</p>}
        {loaded === null && <p className="text-zinc-500">Chat isn&apos;t available for this dispute.</p>}
        {loaded?.unavailable && <p className="text-zinc-500">Chat isn&apos;t set up yet (run supabase/chat.sql).</p>}

        {loaded?.conversationId && resumeChoice === null && (
          <div className="rounded-md bg-zinc-50 px-3 py-3 dark:bg-zinc-900">
            <p className="font-medium">Pick up where you left off?</p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Last time you asked: &ldquo;{loaded.lastAsked}&rdquo; · {loaded.lastAt ? when(loaded.lastAt) : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => resume("continue")} className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                Continue
              </button>
              <button type="button" onClick={() => resume("fresh")} className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700">
                Start fresh
              </button>
            </div>
          </div>
        )}

        {resumeChoice !== null && turns.length === 0 && (
          <div>
            <p className="text-zinc-600 dark:text-zinc-400">Ask about this dispute, or ask Sira to change the drafts.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={pending} className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={t.role === "seller" ? "flex justify-end" : ""}>
            <div className={t.role === "seller" ? "max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900" : "max-w-[95%]"}>
              <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
              {t.role === "sira" && t.saved && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">✓ Drafts updated above. Nothing is sent until you approve.</p>}
              {t.role === "sira" && t.preview && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-zinc-500">Revised drafts (demo account: shown here, not saved)</p>
                  {t.preview.map((d, j) => (
                    <div key={j} className="rounded-md border border-zinc-200 dark:border-zinc-800">
                      <p className="border-b border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-800">
                        {DRAFT_LABELS[d.action]} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
                      </p>
                      <p className="whitespace-pre-wrap px-2 py-1.5">{d.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && resumeChoice !== null && <p className="text-zinc-500">Sira is thinking…</p>}
        <div ref={endRef} />
      </div>

      {resumeChoice !== null && !loaded?.unavailable && loaded !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="border-t border-zinc-200 p-2 dark:border-zinc-800"
        >
          {error && <p className="mb-2 px-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              placeholder="Ask about this dispute…"
              disabled={pending}
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 outline-none focus:border-zinc-400 dark:border-zinc-800"
            />
            <button type="submit" disabled={pending || !text.trim()} className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
