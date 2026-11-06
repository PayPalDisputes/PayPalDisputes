import Link from "next/link";
import { connection } from "next/server";
import { Bell, ChartNoAxesColumn, FileText, House, Inbox, Settings } from "lucide-react";
import { AccountMenu } from "@/components/app/AccountMenu";
import { MobileNav } from "@/components/app/MobileNav";
import { NavLink } from "@/components/app/NavLink";
import { Logo } from "@/components/ui/Logo";
import { requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getHomeDataCached } from "@/lib/dashboard";

/**
 * Seller workspace shell: one top bar (logo, section tabs, then amounts toggle, notifications and the
 * account on the right) over pages on a near-white canvas. Phones get the floating menu instead of tabs.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // counts come from live Supabase rows
  const session = await requireSession();
  const { disputes } = await getHomeDataCached(sellerScope(session));
  const accountName = session.kind === "seller" ? session.name : "Demo account";
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "S";
  const needsResponse = disputes.filter((d) => d.status === "WAITING_FOR_SELLER_RESPONSE").length;
  const mode = sessionMode(session);
  const bellLabel = needsResponse === 1 ? "1 dispute needs a response" : `${needsResponse} disputes need a response`;

  return (
    <div className="theme-app flex min-h-full flex-1 flex-col bg-subtle text-fg [color-scheme:light]">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
        {/* Three columns: logo left, tabs dead centre, controls right */}
        <div className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 md:px-8 xl:gap-6">
          <Link href="/dashboard" className="justify-self-start" aria-label="Sira dashboard home">
            <Logo imageClassName="h-12" />
          </Link>

          <nav aria-label="Workspace" className="hidden items-center gap-1 lg:flex">
            <NavLink variant="top" href="/dashboard" exact icon={<House strokeWidth={1.7} />}>
              Home
            </NavLink>
            <NavLink variant="top" href="/disputes" icon={<Inbox strokeWidth={1.7} />}>
              Disputes
            </NavLink>
            <NavLink variant="top" href="/evidence" icon={<FileText strokeWidth={1.7} />}>
              Shipping proof
            </NavLink>
            <NavLink variant="top" href="/insights" icon={<ChartNoAxesColumn strokeWidth={1.7} />}>
              Insights
            </NavLink>
          </nav>

          <div className="col-start-3 flex items-center justify-self-end gap-2">
            <span
              title={mode === "live" ? "Approvals reach PayPal" : "Nothing is sent to PayPal"}
              className="mr-1 hidden rounded-full bg-muted px-2.5 py-1 text-[12px] whitespace-nowrap text-fg-body lg:inline"
            >
              {mode === "live" ? "Live" : "Demo mode"}
            </span>
            <HeaderIcon href="/disputes?view=needs-response" label={bellLabel} tooltip="Notifications">
              {/* The bell rings once when the page opens if something needs a response, and again on hover */}
              <Bell strokeWidth={1.6} className={`bell-icon size-[18px] ${needsResponse > 0 ? "animate-bell-ring" : ""}`} />
              {needsResponse > 0 && <span className="animate-pulse-dot absolute top-2 right-2.5 size-2 rounded-full border-2 border-canvas bg-accent" />}
            </HeaderIcon>
            <HeaderIcon href="/settings" label="Settings" tooltip="Settings">
              <Settings strokeWidth={1.6} className="size-[18px] transition-transform duration-300 group-hover:rotate-45" />
            </HeaderIcon>
            <AccountMenu name={accountName} initials={initials} variant="compact" />
          </div>
        </div>
      </header>

      {/* Bottom room on phones so the floating menu never covers the end of a page */}
      <main id="main" className="flex-1 pb-24 lg:pb-0">
        {children}
      </main>

      <MobileNav
        accountName={accountName}
        items={[
          { href: "/dashboard", label: "Home", icon: "home", exact: true },
          { href: "/disputes", label: "Disputes", icon: "disputes" },
          { href: "/evidence", label: "Shipping proof", icon: "evidence" },
          { href: "/insights", label: "Insights", icon: "insights" },
          { href: "/settings", label: "Settings", icon: "settings" },
        ]}
      />
    </div>
  );
}

/** A round icon button in the top bar with a dark tooltip under it on hover or keyboard focus, like Stripe's. */
function HeaderIcon({ href, label, tooltip, children }: { href: string; label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group relative inline-flex size-10 items-center justify-center rounded-full text-fg-body transition-colors hover:bg-muted hover:text-fg focus-visible:bg-muted"
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 rounded-md bg-fg px-2.5 py-1 text-[12.5px] whitespace-nowrap text-white opacity-0 transition-opacity delay-150 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {tooltip}
      </span>
    </Link>
  );
}
