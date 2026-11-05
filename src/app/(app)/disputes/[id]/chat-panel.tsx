"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ChatMessage, DraftPreview } from "@/lib/chat";
import { DRAFT_LABELS } from "@/app/_components/dispute-ui";
import { askSira, getChat } from "./chat-actions";

// Questions Sira answers; it doesn't rewrite drafts (the seller edits the text or the template in Settings).
const SUGGESTIONS = ["Why this recommendation?", "What if I refund instead?", "What proof helps most?", "What happens next?"];
const MAX = 1000; // matches MAX_MESSAGE_CHARS on the server

type Loaded = Awaited<ReturnType<typeof getChat>>;
type Turn = ChatMessage & { preview?: DraftPreview[] | null; saved?: boolean };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * "Ask Sira": chat about this dispute. Only ever changes drafts; sending still needs Approve.
 * `inline` sits in the page (the side panel); `floating` is a chat button in the bottom-right corner
 * that opens a chat window above it, with a one-time nudge bubble (the full dispute page).
 */
export function ChatPanel({ disputeId, variant = "inline" }: { disputeId: string; variant?: "inline" | "floating" }) {
  const [open, setOpen] = useState(false);
  // The nudge bubble appears a moment after the page opens, until the seller opens the chat or dismisses it.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (variant !== "floating") return;
    const t = setTimeout(() => setNudge(true), 1200);
    return () => clearTimeout(t);
  }, [variant]);
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
    setNudge(false);
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

  const conversation = (
    <>
        <div className={cn("space-y-3 overflow-y-auto py-3", variant === "floating" ? "min-h-0 flex-1 px-5" : "max-h-[440px] px-6")}>
          {loaded === undefined && <p className="text-fg-muted">Loading…</p>}
          {loaded === null && <p className="text-fg-muted">Chat isn&apos;t available for this dispute.</p>}
          {loaded?.unavailable && <p className="text-fg-muted">Ask Sira isn&apos;t available right now.</p>}

          {loaded?.conversationId && resumeChoice === null && (
            <div className="rounded-xl bg-muted/70 px-4 py-3">
              <p className="font-medium text-fg">Pick up where you left off?</p>
              <p className="mt-1 text-fg-body">
                Last time you asked: &ldquo;{loaded.lastAsked}&rdquo; · {loaded.lastAt ? when(loaded.lastAt) : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => resume("continue")} className="h-8 rounded-md bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover">
                  Continue
                </button>
                <button type="button" onClick={() => resume("fresh")} className="h-8 rounded-md bg-canvas px-3.5 text-[13px] text-fg hover:bg-inset">
                  Start fresh
                </button>
              </div>
            </div>
          )}

          {resumeChoice !== null && turns.length === 0 && (
            <div>
              <p className="text-fg-body">Ask anything about this dispute.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} disabled={pending} className="h-[34px] rounded-md bg-muted px-3.5 text-[13.5px] text-fg hover:bg-inset disabled:opacity-50">
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
            className={cn("pt-1 pb-5", variant === "floating" ? "px-5" : "px-6")}
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
              <button type="submit" disabled={pending || !text.trim()} className="h-8 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-50">
                Ask
              </button>
            </div>
          </form>
        )}
    </>
  );

  if (variant === "floating") {
    return (
      <div className="fixed right-4 bottom-24 z-40 flex flex-col items-end gap-3 sm:right-6 lg:bottom-6">
        {open && (
          <section
            aria-label="Ask Sira"
            className="animate-fade-up flex h-[min(600px,calc(100vh-180px))] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-line bg-canvas text-[14px] shadow-float sm:w-[400px]"
          >
            <div className="flex items-center justify-between border-b border-line-subtle px-5 py-3.5">
              <span className="flex flex-col">
                <span className="text-[15px] font-[480] text-fg">Ask Sira</span>
                <span className="text-[12.5px] text-fg-muted">About this dispute. Nothing is sent until you approve.</span>
              </span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="inline-flex size-8 items-center justify-center rounded-full text-fg-muted hover:bg-muted hover:text-fg">
                <X strokeWidth={1.8} className="size-4" />
              </button>
            </div>
            {conversation}
          </section>
        )}

        {!open && nudge && (
          <div className="animate-fade-up relative max-w-[260px] rounded-xl border border-line bg-canvas py-3 pr-9 pl-4 text-[13.5px] leading-5 text-fg shadow-float">
            <button type="button" onClick={openPanel} className="text-left">
              Questions about this dispute? <span className="text-accent">Ask Sira.</span>
            </button>
            <button type="button" onClick={() => setNudge(false)} aria-label="Dismiss" className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full text-fg-muted hover:bg-muted hover:text-fg">
              <X strokeWidth={1.8} className="size-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-label={open ? "Close chat" : "Ask Sira about this dispute"}
          aria-expanded={open}
          className="inline-flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition-transform hover:scale-105 hover:bg-accent-hover active:scale-95"
        >
          {open ? <X strokeWidth={2} className="size-6" /> : <MessageCircle strokeWidth={1.8} className="size-6" />}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-canvas px-6 py-4 text-left transition-colors hover:border-line-strong"
      >
        <span className="text-[13px] font-medium text-accent">Ask Sira about this dispute</span>
        <span className="text-[13px] text-fg-muted">Why this call? What if I refund? Ask anything</span>
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

      {conversation}
    </section>
  );
}
