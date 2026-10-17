import { Check, Circle, Clock3, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-canvas",
        interactive && "transition-colors duration-200 hover:border-line-strong",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge / StatusBadge                                                 */
/* ------------------------------------------------------------------ */

export type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "dark" | "outline";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-fg-body ring-line",
  ok: "bg-ok-bg text-ok ring-ok/15",
  warn: "bg-warn-bg text-warn ring-warn/15",
  bad: "bg-bad-bg text-bad ring-bad/15",
  info: "bg-info-bg text-info ring-info/15",
  dark: "bg-fg text-white ring-fg",
  outline: "bg-canvas text-fg ring-line-strong",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium leading-none whitespace-nowrap ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const statusMap = {
  drafted: { label: "Drafted", tone: "info" },
  awaiting: { label: "Awaiting buyer", tone: "neutral" },
  review: { label: "Needs review", tone: "warn" },
  sent: { label: "Sent", tone: "neutral" },
  won: { label: "Won", tone: "ok" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export function StatusBadge({ status }: { status: keyof typeof statusMap }) {
  const s = statusMap[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const decisionMap = {
  fight: { label: "Fight", tone: "outline" },
  refund: { label: "Refund", tone: "neutral" },
  settle: { label: "Settle", tone: "warn" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export function DecisionBadge({ decision }: { decision: keyof typeof decisionMap }) {
  const d = decisionMap[decision];
  return <Badge tone={d.tone}>{d.label}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Avatar (initials, deterministic tint)                               */
/* ------------------------------------------------------------------ */

const tints = ["#e8e3d8", "#dfe6e2", "#e4dfe8", "#dde3ec", "#ebe2d9", "#e2e6da"];

export function Avatar({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const tint = tints[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length];
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium text-fg-heading", className)}
      style={{ width: size, height: size, background: tint, fontSize: Math.max(8, size * 0.4) }}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small bits                                                          */
/* ------------------------------------------------------------------ */

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line bg-canvas px-1 font-mono text-[10px] leading-none text-fg-muted shadow-[0_1px_0_var(--mk-line)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Small square with an icon inside, used across nav, benefit cells and cards. */
export function IconTile({ children, className, dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
        dark
          ? "bg-fg text-white shadow-[inset_0_0.75px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)]"
          : "border border-line bg-subtle text-fg-heading shadow-[0_1px_1px_rgba(28,25,20,0.04)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Check / spinner / pending marker for step lists. */
export function StepIcon({ state }: { state: "done" | "running" | "pending" | "failed" }) {
  if (state === "done")
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-ok text-white">
        <Check strokeWidth={2.5} className="size-2.5" />
      </span>
    );
  if (state === "running") return <Loader2 strokeWidth={2} className="size-4 animate-spin-slow text-fg-muted" />;
  if (state === "failed")
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-bad text-white">
        <X strokeWidth={2.5} className="size-2.5" />
      </span>
    );
  return <Circle strokeWidth={1.5} className="size-4 text-line-strong" />;
}

export function DaysLeft({ days }: { days: number }) {
  if (days <= 0) return <span className="text-fg-muted">Closed</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", days <= 3 ? "text-bad" : days <= 7 ? "text-warn" : "text-fg-body")}>
      <Clock3 aria-hidden strokeWidth={1.75} className="size-3" />
      {days}d
    </span>
  );
}
