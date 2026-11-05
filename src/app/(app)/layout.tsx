import Link from "next/link";
import { connection } from "next/server";
import { Bell, ChartNoAxesColumn, FileText, FlaskConical, House, Inbox, SlidersHorizontal } from "lucide-react";
import { AccountMenu } from "@/components/app/AccountMenu";
import { HideAmounts } from "@/components/app/HideAmounts";
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
  // Team-only tools (Evals) stay out of the seller's navigation unless SHOW_INTERNAL_TOOLS=true.
  const showInternal = process.env.SHOW_INTERNAL_TOOLS === "true";

  return (
    <div className="theme-app flex min-h-full flex-1 flex-col bg-subtle text-fg [color-scheme:light]">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
        <div className="flex h-[68px] items-center gap-6 px-5 md:px-8">
          <Link href="/dashboard" className="shrink-0" aria-label="Sira dashboard home">
            <Logo imageClassName="h-12" />
          </Link>

          <nav aria-label="Workspace" className="hidden items-center gap-1 lg:flex">
            <NavLink variant="top" href="/dashboard" exact icon={<House strokeWidth={1.7} />}>
              Home
            </NavLink>
            <NavLink variant="top" href="/disputes" icon={<Inbox strokeWidth={1.7} />} badge={needsResponse}>
              Disputes
            </NavLink>
            <NavLink variant="top" href="/evidence" icon={<FileText strokeWidth={1.7} />}>
              Shipping proof
            </NavLink>
            <NavLink variant="top" href="/insights" icon={<ChartNoAxesColumn strokeWidth={1.7} />}>
              Insights
            </NavLink>
            <NavLink variant="top" href="/settings" icon={<SlidersHorizontal strokeWidth={1.7} />}>
              Settings
            </NavLink>
            {showInternal && (
              <NavLink variant="top" href="/evals" icon={<FlaskConical strokeWidth={1.7} />}>
                Evals
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              title={mode === "live" ? "Approvals reach PayPal" : "Nothing is sent to PayPal"}
              className="mr-1 hidden rounded-full bg-muted px-2.5 py-1 text-[12px] whitespace-nowrap text-fg-body lg:inline"
            >
              {mode === "live" ? "Live" : "Demo mode"}
            </span>
            <HideAmounts />
            <Link
              href="/disputes?view=needs-response"
              aria-label={bellLabel}
              title={bellLabel}
              className="relative inline-flex size-10 items-center justify-center rounded-md bg-muted text-fg-body transition-colors hover:bg-inset hover:text-fg"
            >
              <Bell strokeWidth={1.6} className="size-[17px]" />
              {needsResponse > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full border-2 border-muted bg-accent" />}
            </Link>
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
          { href: "/disputes", label: "Disputes", icon: "disputes", badge: needsResponse },
          { href: "/evidence", label: "Shipping proof", icon: "evidence" },
          { href: "/insights", label: "Insights", icon: "insights" },
          { href: "/settings", label: "Settings", icon: "settings" },
          ...(showInternal ? [{ href: "/evals", label: "Evals", icon: "evals" as const }] : []),
        ]}
      />
    </div>
  );
}
