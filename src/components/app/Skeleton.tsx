import { cn } from "@/lib/cn";

/** A grey placeholder block that pulses while real content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Placeholder for a dashboard page: title, a row of cards, then a list. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 pt-8 pb-20 md:px-8">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:max-w-[520px]">
        <Skeleton className="h-[104px]" />
        <Skeleton className="h-[104px]" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-6">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder for the dispute side panel's body. */
export function PanelBodySkeleton() {
  return (
    <div role="status" aria-label="Loading dispute" className="flex flex-col gap-5 px-5 py-6 sm:px-7">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-[50px]" />
      <Skeleton className="h-[76px]" />
      <Skeleton className="h-[220px]" />
      <Skeleton className="h-[140px]" />
    </div>
  );
}

/**
 * Placeholder for a full dispute page (/disputes/[id]), laid out like the real page: header with the
 * amount and buttons, the deadline, then Sira's report on the left and the details on the right.
 * A progress bar and "Loading dispute…" make it clear the case is on its way.
 */
export function DisputePageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-5 pt-7 pb-20 md:px-10">
      <div className="flex flex-col gap-2">
        <div className="h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-muted">
          <div className="animate-creep h-full w-full rounded-full bg-accent" />
        </div>
        <p className="text-[13px] text-fg-muted">Loading dispute…</p>
      </div>

      <div className="flex flex-col gap-3.5">
        <Skeleton className="h-3.5 w-36" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </div>
          <div className="flex flex-col items-end gap-3">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-[38px] w-32" />
              <Skeleton className="h-[38px] w-32" />
            </div>
          </div>
        </div>
        <Skeleton className="h-[50px] max-w-[560px]" />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas px-6 py-5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas px-6 py-5">
            <Skeleton className="h-3.5 w-32" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-xl border border-line bg-canvas px-[22px] py-5">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className={i % 5 === 0 ? "h-3.5 w-24" : "h-4"} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shown for a moment before each draft on the Review page, laid out like the draft itself: the case,
 * Sira's call, what it found and the message. A progress bar and a line of text say what's happening.
 */
export function ReviewDraftSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-9 px-6 pt-12 pb-10 md:px-8">
      <div className="flex flex-col gap-2">
        <div className="h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-muted">
          <div className="animate-creep h-full w-full rounded-full bg-accent" />
        </div>
        <p className="text-[13px] text-fg-muted">{label}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-48" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-7">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
