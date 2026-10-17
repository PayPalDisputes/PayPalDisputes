import { cn } from "@/lib/cn";

/** Green dot + label with a small hover/focus tooltip. Static for now; wire it to a real status source later. */
export function SystemStatus({ className }: { className?: string }) {
  return (
    <div className={cn("group/status relative inline-flex", className)}>
      <span
        tabIndex={0}
        aria-describedby="system-status-tip"
        className="inline-flex h-7 items-center gap-2 rounded-full border border-line bg-canvas pr-3 pl-2.5 text-[12.5px] text-fg-body focus-visible:outline-2 focus-visible:outline-fg"
      >
        <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-ok" />
        All systems operational
      </span>
      <span
        id="system-status-tip"
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-[220px] translate-y-1 rounded-lg bg-fg px-2.5 py-1.5 text-[12px] leading-4 text-white opacity-0 shadow-float transition-[opacity,transform] duration-150 group-hover/status:translate-y-0 group-hover/status:opacity-100 group-focus-within/status:translate-y-0 group-focus-within/status:opacity-100"
      >
        Webhooks, assessments and the dashboard are running normally.
      </span>
    </div>
  );
}
