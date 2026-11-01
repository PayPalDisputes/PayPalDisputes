"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, FileText, FlaskConical, House, Inbox, LogOut, Menu, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = { home: House, disputes: Inbox, evidence: FileText, insights: ChartNoAxesColumn, settings: SlidersHorizontal, evals: FlaskConical };

export type MobileNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number };

/**
 * Phone navigation in the style of Vercel's mobile site: a floating "Find | ☰" pill at the bottom
 * of the screen that opens a sheet with search, every section and Sign out.
 */
export function MobileNav({ items, accountName }: { items: MobileNavItem[]; accountName: string }) {
  const [open, setOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Close on Escape; lock page scroll while open. Links and search close it as they navigate.
  useEffect(() => {
    if (!open) return;
    if (focusSearch) searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, focusSearch]);

  const show = (search: boolean) => {
    setFocusSearch(search);
    setOpen(true);
  };
  const isActive = (i: MobileNavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  return (
    <div className="lg:hidden">
      {/* The floating pill */}
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-12 items-center rounded-full border border-line bg-canvas/95 shadow-float backdrop-blur-md">
          <button type="button" onClick={() => show(true)} className="flex h-full items-center gap-2 pr-4 pl-5 text-[14.5px] text-fg-body">
            <Search aria-hidden strokeWidth={1.8} className="size-[17px]" />
            Find
          </button>
          <span aria-hidden className="h-5 w-px bg-line-strong" />
          <button type="button" onClick={() => show(false)} aria-label="Open menu" aria-expanded={open} className="flex h-full items-center pr-5 pl-4 text-fg">
            <Menu aria-hidden strokeWidth={1.8} className="size-5" />
          </button>
        </div>
      </div>

      {/* The sheet */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="animate-fade-in absolute inset-0 bg-fg/30" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="animate-fade-up absolute inset-x-3 bottom-3 flex max-h-[85dvh] flex-col overflow-y-auto rounded-xl border border-line bg-canvas p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-float"
          >
            <form action="/disputes" role="search" onSubmit={() => setOpen(false)} className="flex items-center gap-2">
              <label className="flex h-11 flex-1 items-center gap-2.5 rounded-md border border-line bg-subtle px-3.5 focus-within:border-line-strong">
                <Search aria-hidden strokeWidth={1.8} className="size-4 text-fg-muted" />
                <span className="sr-only">Search disputes</span>
                <input
                  ref={searchRef}
                  type="search"
                  name="q"
                  placeholder="Search buyer, item or dispute ID"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
                />
              </label>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-md text-fg-body hover:bg-muted">
                <X aria-hidden strokeWidth={1.8} className="size-5" />
              </button>
            </form>

            <nav aria-label="Workspace" className="mt-2 flex flex-col">
              {items.map((i) => {
                const Icon = ICONS[i.icon];
                const active = isActive(i);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("flex h-12 items-center gap-3 rounded-md px-3 text-[15px]", active ? "bg-muted font-medium text-fg" : "text-fg-body hover:bg-subtle")}
                  >
                    <Icon aria-hidden strokeWidth={1.6} className={cn("size-[18px]", active ? "text-fg" : "text-fg-muted")} />
                    <span className="flex-1">{i.label}</span>
                    {i.badge ? <span className="rounded-full bg-accent px-2 text-[12px] leading-5 font-medium text-white tabular-nums">{i.badge}</span> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 flex items-center gap-3 border-t border-line px-3 pt-3">
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg-muted">{accountName}</span>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-[14px] text-fg hover:bg-muted">
                  <LogOut aria-hidden strokeWidth={1.6} className="size-4 text-fg-muted" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
