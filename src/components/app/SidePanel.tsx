"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Maximize2, X } from "lucide-react";

/**
 * Right-hand drawer for reviewing a dispute without leaving the list.
 * Closes on Esc, the close button or a click on the backdrop, all of which return to `closeHref`.
 */
export function SidePanel({
  title,
  closeHref,
  fullHref,
  nextHref,
  nextLabel,
  children,
}: {
  title: string;
  /** The list underneath, without the open dispute. */
  closeHref: string;
  /** The same dispute as a full page. */
  fullHref: string;
  /** The next dispute in the review queue, if any. */
  nextHref?: string;
  nextLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => router.push(closeHref, { scroll: false });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus?.();
    };
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={-1}
        onClick={close}
        className="animate-fade-in absolute inset-0 cursor-default bg-fg/25 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="animate-slide-in-right relative flex h-full w-full max-w-[600px] flex-col bg-canvas shadow-[-24px_0_60px_-30px_rgba(42,37,34,0.45)] outline-none"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-full text-fg-body transition-colors hover:bg-muted hover:text-fg"
          >
            <X strokeWidth={1.75} className="size-5" />
          </button>
          <span className="truncate text-[14px] font-medium text-fg">{title}</span>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href={fullHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-fg-body transition-colors hover:bg-muted hover:text-fg"
            >
              <Maximize2 aria-hidden strokeWidth={1.75} className="size-3.5" />
              <span className="hidden sm:inline">Full page</span>
            </Link>
            {nextHref && (
              <Link
                href={nextHref}
                replace
                scroll={false}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-fg px-3.5 text-[13px] font-medium whitespace-nowrap text-white transition-colors hover:bg-[#37322f]"
              >
                <span className="hidden sm:inline">{nextLabel ?? "Next"}</span>
                <span className="sm:hidden">Next</span>
                <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
