import { ChevronsUpDown, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The signed-in account: initials (and name, in the sidebar) that open a small menu with Sign out.
 * A native <details> menu, so it works without client JS.
 */
export function AccountMenu({
  name,
  initials,
  variant,
}: {
  name: string;
  initials: string;
  /** "sidebar": full-width row at the bottom of the sidebar, menu opens upward. "compact": just the avatar. */
  variant: "sidebar" | "compact";
}) {
  const avatar = (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-inset text-[12px] font-medium text-fg-body">
      {initials}
    </span>
  );
  return (
    <details className={cn("group relative", variant === "sidebar" && "w-full")}>
      <summary
        aria-label={`Account: ${name}`}
        className={cn(
          "flex cursor-pointer list-none items-center gap-2.5 rounded-lg transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden",
          variant === "sidebar" ? "w-full px-2.5 py-2" : "p-1",
        )}
      >
        {avatar}
        {variant === "sidebar" && (
          <>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{name}</span>
            <ChevronsUpDown aria-hidden strokeWidth={1.6} className="size-4 text-fg-muted" />
          </>
        )}
      </summary>
      <div
        className={cn(
          "absolute z-40 w-52 rounded-lg border border-line bg-canvas p-1 shadow-float",
          variant === "sidebar" ? "bottom-full left-0 mb-1.5" : "top-full right-0 mt-1.5",
        )}
      >
        <p className="truncate px-2.5 pt-1.5 pb-2 text-[12px] text-fg-muted">{name}</p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13.5px] text-fg transition-colors hover:bg-muted"
          >
            <LogOut aria-hidden strokeWidth={1.6} className="size-4 text-fg-muted" />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
