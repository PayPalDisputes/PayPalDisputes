"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Sidebar, top-bar or tab link that highlights itself when its section is open. */
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
  variant?: "sidebar" | "tab" | "top";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (variant === "top") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md px-3 text-[14px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-fg",
          active ? "bg-accent-bg font-medium text-accent" : "text-fg-body hover:bg-muted hover:text-fg",
        )}
      >
        <span className="[&>svg]:size-4">{icon}</span>
        {children}
        {badge ? <span className={cn("text-[12.5px] tabular-nums", active ? "text-accent" : "text-fg-muted")}>{badge}</span> : null}
      </Link>
    );
  }

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
        {badge ? <span className="text-[12.5px] text-fg-muted tabular-nums">{badge}</span> : null}
        {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fg" />}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-fg",
        active ? "bg-muted text-fg" : "text-fg-body hover:bg-muted/60 hover:text-fg",
      )}
    >
      <span className="[&>svg]:size-[17px]">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? <span className="text-[13px] text-fg-muted tabular-nums">{badge}</span> : null}
    </Link>
  );
}
