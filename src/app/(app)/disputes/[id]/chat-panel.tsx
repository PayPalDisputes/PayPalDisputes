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
        className="flex w-full items-center justify-between rounded-xl border border-line bg-canvas px-6 py-4 text-left transition-colors hover:border-line-strong"
      >
        <span className="text-[13px] font-medium text-accent">Ask Sira about this dispute</span>
        <span className="text-[13px] text-fg-muted">Why this call? Change the tone? Ask anything</span>
      </button>
    );
  }

  return (
    <section aria-label="Ask Sira" className="rounded-xl border border-line bg-canvas text-[14px]">
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <span className="text-[13px] font-medium text-accent">Ask Sira about this dispute</span>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-fg-muted hover:text-fg">
          Close
        </button>
      </div>

      <div className="max-h-[440px] space-y-3 overflow-y-auto px-6 py-3">
        {loaded === undefined && <p className="text-fg-muted">Loading…</p>}
        {loaded === null && <p className="text-fg-muted">Chat isn&apos;t available for this dispute.</p>}
        {loaded?.unavailable && <p className="text-fg-muted">Chat isn&apos;t set up yet (run supabase/chat.sql).</p>}

        {loaded?.conversationId && resumeChoice === null && (
          <div className="rounded-xl bg-muted/70 px-4 py-3">
            <p className="font-medium text-fg">Pick up where you left off?</p>
            <p className="mt-1 text-fg-body">
              Last time you asked: &ldquo;{loaded.lastAsked}&rdquo; · {loaded.lastAt ? when(loaded.lastAt) : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => resume("continue")} className="h-8 rounded-full bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-[#0062c4]">
                Continue
              </button>
              <button type="button" onClick={() => resume("fresh")} className="h-8 rounded-full bg-canvas px-3.5 text-[13px] text-fg hover:bg-inset">
                Start fresh
              </button>
            </div>
          </div>
        )}

        {resumeChoice !== null && turns.length === 0 && (
          <div>
            <p className="text-fg-body">Ask about this dispute, or ask Sira to change the drafts.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={pending} className="h-[34px] rounded-full bg-muted px-3.5 text-[13.5px] text-fg hover:bg-inset disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={t.role === "seller" ? "flex justify-end" : ""}>
            <div className={t.role === "seller" ? "max-w-[80%] rounded-xl bg-muted px-3.5 py-2.5 text-fg" : "max-w-[95%] text-fg"}>
              <p className="leading-[23px] whitespace-pre-wrap">{t.content}</p>
              {t.role === "sira" && t.saved && <p className="mt-1 text-[12.5px] text-ok">Drafts updated above. Nothing is sent until you approve.</p>}
              {t.role === "sira" && t.preview && (
                <div className="mt-2 space-y-2">
                  <p className="text-[12.5px] text-fg-muted">Revised drafts (demo account: shown here, not saved)</p>
                  {t.preview.map((d, j) => (
                    <div key={j} className="rounded-xl bg-muted/70">
                      <p className="px-4 pt-3 text-[12.5px] text-fg-muted">
                        {DRAFT_LABELS[d.action]} → {d.recipient === "paypal" ? "PayPal" : "buyer"}
                      </p>
                      <p className="px-4 pt-1 pb-3 whitespace-pre-wrap">{d.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && resumeChoice !== null && <p className="text-fg-muted">Sira is thinking…</p>}
        <div ref={endRef} />
      </div>

      {resumeChoice !== null && !loaded?.unavailable && loaded !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="px-6 pt-1 pb-5"
        >
          {error && <p className="mb-2 text-[12.5px] text-bad">{error}</p>}
          <div className="flex h-11 items-center gap-2 rounded-xl border border-line pr-1.5 pl-3.5 focus-within:border-line-strong">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              placeholder="Ask anything about this dispute"
              aria-label="Ask Sira"
              disabled={pending}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-muted"
            />
            <button type="submit" disabled={pending || !text.trim()} className="h-8 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-[#0062c4] disabled:opacity-50">
              Ask
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
