import { cn } from "@/lib/cn";

/** A grey placeholder block that pulses while real content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Placeholder for a dashboard page: title, a row of cards, then a list. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-5 pt-8 pb-20 md:px-8">
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
