"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Image as ImageIcon, MousePointer2, X } from "lucide-react";
import { useReducedMotion } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

/**
 * One scene per step of the walkthrough, all following the same (fictional) dispute. A scene
 * plays while its container has `data-play="on"`; the beats are CSS (`.play-*` in globals.css),
 * each waiting for its own `--d` delay. Decorative: the step text says the same thing.
 */

type Scene = (props: { on: boolean }) => React.ReactNode;

const card = "rounded-xl border border-[#141312]/[0.08] bg-white shadow-[0_1px_2px_rgba(20,19,18,0.04),0_12px_32px_-14px_rgba(20,19,18,0.14)]";
const label = "font-mono text-[9.5px] tracking-[0.12em] text-[#8a867f] uppercase";
/** CSS variables for a beat: delay, and optional from/to offsets for `.play-move`. */
const at = (ms: number, more?: Record<string, string>) => ({ "--d": `${ms}ms`, ...more }) as React.CSSProperties;

function Ok() {
  return (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#0070E0] text-white">
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}
function Miss() {
  return (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#b4552f] text-white">
      <X className="size-2.5" strokeWidth={3} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 1. A new dispute arrives                                            */
/* ------------------------------------------------------------------ */

const queue = [
  { reason: "Unauthorized", amount: "$1,240.00", days: "6 days" },
  { reason: "Not as described", amount: "$1,309.00", days: "11 days" },
  { reason: "Duplicate transaction", amount: "$89.99", days: "14 days" },
];

const SyncScene: Scene = () => (
  <div className="w-full max-w-[440px]">
    <div className="flex items-center gap-3">
      <span className={cn(card, "px-3 py-1.5 text-[12px]")}>PayPal</span>
      <div className="relative h-px flex-1 border-t border-dashed border-[#141312]/25">
        <span className="play-travel absolute -top-[5px] -ml-1.5 h-[9px] w-3 rounded-sm bg-[#0070E0]" style={at(200)} />
      </div>
      <span className="rounded-lg bg-[#141312] px-3 py-1.5 text-[12px] text-white">Sira</span>
    </div>
    <p className="play-item mt-2 text-center font-mono text-[9.5px] tracking-[0.1em] text-[#8a867f] uppercase" style={at(300)}>
      CUSTOMER.DISPUTE.CREATED
    </p>

    <div className={cn(card, "mt-6 overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-[#141312]/[0.06] px-4 py-2.5">
        <span className={label}>Open disputes</span>
        <span className="text-[10.5px] text-[#8a867f]">Sorted by deadline</span>
      </div>
      <div className="relative h-[176px]">
        <div className="play-item play-flash absolute inset-x-0 top-0 flex h-11 items-center gap-3 px-4 text-[12.5px]" style={at(1000)}>
          <span className="rounded bg-[#0070E0] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-white">NEW</span>
          <span className="flex-1 truncate font-medium">Item not received</span>
          <span className="tabular-nums">$2,875.50</span>
          <span className="w-14 text-right font-medium text-[#b4552f]">2 days</span>
        </div>
        {queue.map((q, i) => (
          <div
            key={q.reason}
            className="play-move absolute inset-x-0 top-0 flex h-11 items-center gap-3 border-t border-[#141312]/[0.05] px-4 text-[12.5px] text-[#55524d]"
            style={at(850, { "--fy": `${i * 44}px`, "--ty": `${(i + 1) * 44}px` })}
          >
            <span className="flex-1 truncate">{q.reason}</span>
            <span className="tabular-nums">{q.amount}</span>
            <span className="w-14 text-right">{q.days}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 2. It reads the whole case                                          */
/* ------------------------------------------------------------------ */

const thread = [
  { who: "Buyer", when: "Oct 21", parts: ["I ", "never received my order", ". It's been almost two weeks."], mine: false },
  { who: "You", when: "Oct 21", parts: ["Sorry to hear that. Tracking shows it was ", "delivered on Oct 12", "."], mine: true },
  { who: "Buyer", when: "Oct 22", parts: ["Nothing was left at my door. I want a ", "full refund", "."], mine: false },
];
const facts = [
  ["Reason", "Item not received"],
  ["Amount", "$2,875.50"],
  ["Opened", "Oct 21"],
  ["Buyer asks for", "Full refund"],
  ["Respond by", "Oct 24"],
];

const ReadScene: Scene = () => (
  <div className="grid w-full max-w-[520px] gap-4 sm:grid-cols-[1.35fr_1fr]">
    <div className={cn(card, "space-y-3 p-4")}>
      <span className={label}>Messages</span>
      {thread.map((m, i) => (
        <div key={i} className={cn("play-item rounded-lg px-3 py-2 text-[12px] leading-relaxed", m.mine ? "ml-5 bg-[#f6f6f3]" : "mr-5 bg-[#eef4fd]")} style={at(150 + i * 250)}>
          <p className="mb-0.5 text-[10px] text-[#8a867f]">
            {m.who} · {m.when}
          </p>
          {m.parts.map((p, j) =>
            j === 1 ? (
              <mark key={j} className="play-mark bg-transparent px-0.5 text-inherit" style={at(1000 + i * 300)}>
                {p}
              </mark>
            ) : (
              <span key={j}>{p}</span>
            ),
          )}
        </div>
      ))}
    </div>
    <div className={cn(card, "p-4")}>
      <span className={label}>What matters</span>
      <dl className="mt-3 space-y-2.5 text-[12px]">
        {facts.map(([k, v], i) => (
          <div key={k} className="play-item" style={at(1800 + i * 160)}>
            <dt className="text-[10.5px] text-[#8a867f]">{k}</dt>
            <dd className={cn("font-medium", k === "Respond by" && "text-[#b4552f]")}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 3. It matches your evidence                                         */
/* ------------------------------------------------------------------ */

const events = [
  ["Label created", "Oct 8"],
  ["Shipped", "Oct 9"],
  ["Out for delivery", "Oct 12, 8:41 AM"],
  ["Delivered", "Oct 12, 2:02 PM"],
];

const EvidenceScene: Scene = () => (
  <div className="grid w-full max-w-[520px] gap-4 sm:grid-cols-[1fr_1.05fr]">
    <div className={cn(card, "p-4")}>
      <span className={label}>USPS tracking</span>
      <p className="mt-1 font-mono text-[10.5px] text-[#55524d]">9400 1118 9922 3456 7810 01</p>
      <ol className="relative mt-4 space-y-3.5 pl-5">
        <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-[#141312]/[0.08]" />
        <span className="play-bar-y absolute top-1.5 bottom-1.5 left-[5px] w-px bg-[#0070E0]" style={at(200)} />
        {events.map(([e, when], i) => (
          <li key={e} className="play-item relative text-[12px]" style={at(250 + i * 280)}>
            <span className={cn("absolute top-1 -left-5 size-[11px] rounded-full border-2 border-white", i === 3 ? "bg-[#0070E0]" : "bg-[#8FC3EE]")} />
            <p className={i === 3 ? "font-medium" : ""}>{e}</p>
            <p className="text-[10.5px] text-[#8a867f]">{when}</p>
          </li>
        ))}
      </ol>
    </div>
    <div className="space-y-4">
      <div className={cn(card, "p-4")}>
        <span className={label}>Delivery address</span>
        <div className="mt-3 space-y-2 text-[11.5px]">
          <div className="play-item" style={at(1400)}>
            <p className="text-[10px] text-[#8a867f]">On the PayPal transaction</p>
            <p>1824 Alder St, Portland, OR 97214</p>
          </div>
          <div className="play-item" style={at(1650)}>
            <p className="text-[10px] text-[#8a867f]">Where USPS delivered</p>
            <p>1824 Alder St, Portland, OR 97214</p>
          </div>
          <p className="play-item flex items-center gap-2 pt-1 font-medium text-[#0070E0]" style={at(2000)}>
            <Ok /> Addresses match
          </p>
        </div>
      </div>
      <div className={cn(card, "play-item flex items-center gap-2.5 p-4 text-[12px]")} style={at(2400)}>
        <Miss />
        <span className="flex-1">Signature on delivery</span>
        <span className="font-mono text-[9.5px] tracking-[0.08em] text-[#b4552f] uppercase">Not captured</span>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 4. It checks Seller Protection                                      */
/* ------------------------------------------------------------------ */

const rules = [
  { rule: "Physical item, shipped", ok: true },
  { rule: "Shipped to the address on the transaction", ok: true },
  { rule: "Online tracking shows delivery", ok: true },
  { rule: "Signature confirmation (orders of $750 and up)", ok: false },
];

const ProtectionScene: Scene = () => (
  <div className={cn(card, "w-full max-w-[440px] p-5")}>
    <div className="flex items-center justify-between">
      <span className={label}>Seller Protection</span>
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-[#8a867f] uppercase">Item not received</span>
    </div>
    <ul className="mt-4 divide-y divide-[#141312]/[0.06]">
      {rules.map((r, i) => (
        <li key={r.rule} className="flex items-center gap-3 py-2.5 text-[12.5px]">
          <span className="play-item" style={at(300 + i * 420)}>
            {r.ok ? <Ok /> : <Miss />}
          </span>
          <span className={cn("flex-1", !r.ok && "text-[#55524d]")}>{r.rule}</span>
          <span className="play-item font-mono text-[9.5px] tracking-[0.08em] uppercase" style={at(380 + i * 420)}>
            {r.ok ? <span className="text-[#0070E0]">Met</span> : <span className="text-[#b4552f]">Missing</span>}
          </span>
        </li>
      ))}
    </ul>
    <div className="play-item mt-4 rounded-lg border border-[#b4552f]/25 bg-[#fbf3ee] px-3.5 py-3 text-[12px]" style={at(2200)}>
      <p className="font-medium text-[#8a3d1f]">Not fully covered</p>
      <p className="mt-0.5 text-[#55524d]">A $2,875.50 order needs a signature. The delivery evidence is strong, so the case can still be argued.</p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 5. It weighs the options                                            */
/* ------------------------------------------------------------------ */

const options = [
  { name: "Fight with delivery proof", note: "Tracking and address match; one gap", fit: "84%", pick: true },
  { name: "Offer a partial refund", note: "Keeps the buyer, gives up part of the sale", fit: "48%" },
  { name: "Refund in full", note: "Gives up $2,875.50 the evidence supports keeping", fit: "16%" },
];

const DecideScene: Scene = () => (
  <div className="w-full max-w-[460px] space-y-2.5">
    <span className={label}>Options, against the evidence</span>
    {options.map((o, i) => (
      <div key={o.name} className={cn(card, "play-item relative p-3.5")} style={at(200 + i * 220)}>
        {o.pick && <span className="play-ring pointer-events-none absolute -inset-px rounded-xl" style={at(1900)} />}
        <div className={o.pick ? "" : "play-dim"} style={o.pick ? undefined : at(1900)}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium">{o.name}</p>
            {o.pick && (
              <span className="play-item rounded-full bg-[#0070E0] px-2 py-0.5 text-[10.5px] text-white" style={at(1900)}>
                Recommended
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] text-[#77736c]">{o.note}</p>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#141312]/[0.06]">
            <span className="play-bar block h-full rounded-full bg-[#0070E0]" style={{ width: o.fit, ...at(600 + i * 220) }} />
          </div>
        </div>
      </div>
    ))}
    <ul className="space-y-1.5 pt-2 text-[12px] text-[#55524d]">
      {["Delivered to the PayPal address, with tracking", "Claim opened nine days after delivery", "Add a delivery photo to cover the missing signature"].map((r, i) => (
        <li key={r} className="play-item flex gap-2" style={at(2100 + i * 160)}>
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#0070E0]" />
          {r}
        </li>
      ))}
    </ul>
  </div>
);

/* ------------------------------------------------------------------ */
/* 6. It drafts the response                                           */
/* ------------------------------------------------------------------ */

const DRAFT =
  "The buyer reports the item was not received. USPS tracking 9400 1118 9922 3456 7810 01 shows it was delivered on October 12 at 2:02 PM to 1824 Alder St, Portland, OR, the address on the PayPal transaction. The claim was opened nine days after delivery. The tracking history, invoice and a photo of the delivered package are attached.";
const CPS = 95; // characters per second

/** Types `text` out while `on`; shows all of it at once for reduced motion. */
function Typewriter({ text, on, delay = 300 }: { text: string; on: boolean; delay?: number }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on || reduced) return;
    const t0 = performance.now() + delay;
    const id = window.setInterval(() => {
      const k = Math.max(0, Math.floor(((performance.now() - t0) / 1000) * CPS));
      setN(Math.min(k, text.length));
      if (k >= text.length) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [on, reduced, text, delay]);
  const shown = reduced ? text.length : on ? n : 0;
  return (
    <p className="text-[12.5px] leading-relaxed text-[#2c2a27]">
      {text.slice(0, shown)}
      {!reduced && shown < text.length && <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-[#0070E0]" />}
    </p>
  );
}

const typedMs = 300 + (DRAFT.length / CPS) * 1000;

const DraftScene: Scene = ({ on }) => (
  <div className={cn(card, "w-full max-w-[460px] p-5")}>
    <div className="flex items-center justify-between">
      <span className={label}>Response to PayPal</span>
      <span className="rounded-full bg-[#f6f6f3] px-2 py-0.5 text-[10.5px] text-[#77736c]">Draft</span>
    </div>
    <div className="mt-3 min-h-[118px]">
      <Typewriter key={String(on)} text={DRAFT} on={on} />
    </div>
    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#141312]/[0.06] pt-3.5">
      {[
        { f: "tracking-history.pdf", I: FileText },
        { f: "invoice-1042.pdf", I: FileText },
        { f: "delivery-photo.jpg", I: ImageIcon },
      ].map(({ f, I }, i) => (
        <span key={f} className="play-item inline-flex items-center gap-1.5 rounded-md border border-[#141312]/[0.08] px-2 py-1 text-[11px] text-[#55524d]" style={at(typedMs + 150 + i * 180)}>
          <I className="size-3 text-[#0070E0]" strokeWidth={2} />
          {f}
        </span>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 7. You approve. It's sent and tracked.                              */
/* ------------------------------------------------------------------ */

const pipeline = [
  ["Approved", "by you"],
  ["Sent to PayPal", "Oct 22"],
  ["Under review", "PayPal"],
  ["Closed in your favor", "Oct 30"],
];

const ApproveScene: Scene = () => (
  <div className="w-full max-w-[460px]">
    <div className={cn(card, "relative p-4")}>
      <div className="flex items-center justify-between">
        <span className={label}>Ready for you</span>
        <span className="text-[11px] text-[#77736c]">Item not received · $2,875.50</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {["100%", "94%", "70%"].map((w) => (
          <span key={w} className="block h-1.5 rounded-full bg-[#141312]/[0.07]" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4 flex gap-2 text-[12px]">
        <span className="play-press rounded-full bg-[#141312] px-4 py-1.5 text-white" style={at(1150)}>
          Approve and send
        </span>
        <span className="rounded-full border border-[#141312]/[0.12] px-4 py-1.5">Edit</span>
      </div>
      <MousePointer2
        aria-hidden
        className="play-move absolute top-0 left-0 size-5 fill-[#141312] text-white drop-shadow"
        style={at(250, { "--fx": "300px", "--fy": "150px", "--tx": "70px", "--ty": "100px" })}
      />
    </div>

    <ol className="relative mt-6 grid grid-cols-4 gap-2">
      <span className="absolute top-[7px] right-[12.5%] left-[12.5%] h-px bg-[#141312]/[0.08]" />
      <span className="play-bar absolute top-[7px] right-[12.5%] left-[12.5%] h-px bg-[#0070E0]" style={at(1500)} />
      {pipeline.map(([s, sub], i) => (
        <li key={s} className="relative flex flex-col items-center text-center">
          <span className="play-item relative grid size-[15px] place-items-center rounded-full border-2 border-white bg-[#0070E0]" style={at(1500 + i * 420)}>
            {i === pipeline.length - 1 && <Check className="size-2 text-white" strokeWidth={4} />}
          </span>
          <p className="play-item mt-2 text-[11px] leading-tight font-medium" style={at(1550 + i * 420)}>
            {s}
          </p>
          <p className="play-item text-[10px] text-[#8a867f]" style={at(1600 + i * 420)}>
            {sub}
          </p>
        </li>
      ))}
    </ol>
    <p className="play-item mt-5 text-center text-[11px] text-[#77736c]" style={at(3200)}>
      The outcome is saved to the case, next to the recommendation.
    </p>
  </div>
);

export const scenes: Record<string, Scene> = {
  sync: SyncScene,
  read: ReadScene,
  evidence: EvidenceScene,
  protection: ProtectionScene,
  decide: DecideScene,
  draft: DraftScene,
  approve: ApproveScene,
};
