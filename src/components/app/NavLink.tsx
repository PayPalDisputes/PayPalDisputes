"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Sidebar / tab link that highlights itself when its section is open. */
export function NavLink({
  href,
  exact,
  icon,
  badge,
  variant = "sidebar",
  children,
}: {
  href: string;
  /** Only active on exactly this path (otherwise any sub-path counts too). */
  exact?: boolean;
  icon?: React.ReactNode;
  badge?: number;
  variant?: "sidebar" | "tab";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative inline-flex h-11 items-center gap-1.5 px-1 text-[14px] transition-colors",
          active ? "font-medium text-fg" : "text-fg-body hover:text-fg",
        )}
      >
        {children}
        {badge ? <span className="rounded-full bg-fg px-1.5 text-[10.5px] leading-4 font-medium text-white tabular-nums">{badge}</span> : null}
        {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fg" />}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-fg",
        active ? "bg-canvas font-medium text-fg shadow-[0_1px_2px_rgba(55,50,47,0.08),0_0_0_1px_rgba(55,50,47,0.08)]" : "text-fg-body hover:bg-canvas/60 hover:text-fg",
      )}
    >
      <span className={cn("[&>svg]:size-[18px]", active ? "text-fg" : "text-fg-muted")}>{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="rounded-full bg-fg px-2 text-[11px] leading-5 font-medium text-white tabular-nums">{badge}</span>
      ) : null}
    </Link>
  );
}
