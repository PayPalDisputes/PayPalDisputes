"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Code2,
  FileCheck2,
  FlaskConical,
  Handshake,
  History,
  ListTree,
  Menu,
  Scale,
  Store,
  Webhook,
  X,
} from "lucide-react";
import { nav, site, type NavIcon, type NavItem } from "@/data/site";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Logo } from "../ui/Logo";
import { IconTile } from "../ui/primitives";

const icons: Record<NavIcon, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  scale: Scale,
  "file-check": FileCheck2,
  handshake: Handshake,
  store: Store,
  code: Code2,
  webhook: Webhook,
  flask: FlaskConical,
  book: BookOpen,
  list: ListTree,
  history: History,
};

type NavMenu = Extract<NavItem, { groups: unknown }>;

export function Navbar() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sheetTop, setSheetTop] = useState(64);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on Escape or a click outside.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Lock page scroll behind the mobile sheet.
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  const hoverOpen = (label: string) => {
    clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const hoverClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  return (
    <>
      <header ref={navRef} className="pointer-events-none sticky top-0 z-50 px-3 pt-3 md:px-8">
        {/* Floating pill: the only part of the header that takes clicks or paints a background */}
        <div className="pointer-events-auto relative mx-auto flex h-14 w-full max-w-[920px] items-center justify-between rounded-full border border-line bg-canvas/80 pr-2 pl-5 shadow-[0_1px_2px_rgba(55,50,47,0.05),0_8px_24px_-12px_rgba(55,50,47,0.18)] backdrop-blur-md backdrop-saturate-150">
          <Link href="/" aria-label={`${site.name} home`} className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg">
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) =>
                "groups" in item ? (
                  <li key={item.label} className="relative" onMouseEnter={() => hoverOpen(item.label)} onMouseLeave={hoverClose}>
                    <button
                      type="button"
                      aria-expanded={open === item.label}
                      aria-haspopup="true"
                      onClick={() => setOpen(open === item.label ? null : item.label)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[14px] text-fg-body transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-fg",
                        open === item.label && "text-fg",
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden
                        strokeWidth={1.75}
                        className={cn("size-3.5 opacity-60 transition-transform duration-200", open === item.label && "rotate-180")}
                      />
                    </button>
                    <Dropdown menu={item} open={open === item.label} onNavigate={() => setOpen(null)} />
                  </li>
                ) : (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="inline-flex h-8 items-center rounded-lg px-3 text-[14px] text-fg-body transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="hidden items-center gap-1 lg:flex">
            <Button href={site.appHref} variant="ghost" size="sm">
              Sign in
            </Button>
            <Button href={site.appHref} size="md">
              Open dashboard
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-fg lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => {
              // The sheet sits just under the header, wherever the header currently is.
              setSheetTop(navRef.current?.getBoundingClientRect().bottom ?? 64);
              setMobileOpen((v) => !v);
            }}
          >
            {mobileOpen ? <X strokeWidth={1.75} className="size-5" /> : <Menu strokeWidth={1.75} className="size-5" />}
          </button>
        </div>
      </header>
      {/* Outside the header: its backdrop-filter would otherwise trap this fixed sheet. */}
      <MobileNav open={mobileOpen} top={sheetTop} onClose={() => setMobileOpen(false)} />
    </>
  );
}

function Dropdown({ menu, open, onNavigate }: { menu: NavMenu; open: boolean; onNavigate: () => void }) {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition-[opacity,transform,visibility] duration-200 ease-out-soft",
        open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[0.98] opacity-0",
      )}
    >
      <div className="w-[340px] rounded-[14px] border border-line bg-canvas p-1.5 shadow-float">
        {menu.groups.map((group) => (
          <div key={group.title}>
            <p className="t-label px-3 pt-2 pb-1.5">{group.title}</p>
            <ul>
              {group.links.map((link) => {
                const Icon = link.icon ? icons[link.icon] : null;
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      tabIndex={open ? 0 : -1}
                      className="group/dd flex items-start gap-3 rounded-[10px] p-2.5 transition-colors duration-150 hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
                    >
                      {Icon && (
                        <IconTile className="transition-colors group-hover/dd:border-line-strong">
                          <Icon strokeWidth={1.6} className="size-4" />
                        </IconTile>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium leading-5 text-fg">{link.label}</span>
                        {link.description && <span className="block text-[13px] leading-5 text-fg-muted">{link.description}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileNav({ open, top, onClose }: { open: boolean; top: number; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div
      id="mobile-nav"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-canvas transition-[opacity,transform,visibility] duration-200 ease-out-soft lg:hidden",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
      )}
      style={{ top }}
    >
      <nav aria-label="Mobile" className="px-5 pt-2 pb-10">
        <ul className="divide-y divide-line">
          {nav.map((item) =>
            "groups" in item ? (
              <li key={item.label}>
                <button
                  type="button"
                  aria-expanded={expanded === item.label}
                  tabIndex={open ? 0 : -1}
                  onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                  className="flex w-full items-center justify-between py-4 text-left text-[17px] text-fg"
                >
                  {item.label}
                  <ChevronDown
                    aria-hidden
                    strokeWidth={1.75}
                    className={cn("size-4 text-fg-muted transition-transform duration-200", expanded === item.label && "rotate-180")}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft",
                    expanded === item.label ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <ul className="overflow-hidden">
                    {item.groups.flatMap((g) => g.links).map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          onClick={onClose}
                          tabIndex={open && expanded === item.label ? 0 : -1}
                          className="block py-2.5 pl-1 text-[15px] text-fg-body hover:text-fg"
                        >
                          {link.label}
                          {link.description && <span className="block text-[13px] text-fg-muted">{link.description}</span>}
                        </Link>
                      </li>
                    ))}
                    <li aria-hidden className="h-3" />
                  </ul>
                </div>
              </li>
            ) : (
              <li key={item.label}>
                <Link href={item.href} onClick={onClose} tabIndex={open ? 0 : -1} className="block py-4 text-[17px] text-fg">
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>
        <div className="mt-6 grid gap-2">
          <Button href={site.appHref} size="lg" onClick={onClose} tabIndex={open ? 0 : -1}>
            Open dashboard
          </Button>
          <Button href={site.appHref} size="lg" variant="secondary" onClick={onClose} tabIndex={open ? 0 : -1}>
            Sign in
          </Button>
        </div>
      </nav>
    </div>
  );
}
