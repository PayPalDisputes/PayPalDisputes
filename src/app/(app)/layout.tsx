import Link from "next/link";
import { connection } from "next/server";
import { Bell, ChartNoAxesColumn, FileText, FlaskConical, House, Inbox, Search, SlidersHorizontal } from "lucide-react";
import { AccountMenu } from "@/components/app/AccountMenu";
import { HideAmounts } from "@/components/app/HideAmounts";
import { MobileNav } from "@/components/app/MobileNav";
import { NavLink } from "@/components/app/NavLink";
import { Logo } from "@/components/ui/Logo";
import { requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getHomeDataCached } from "@/lib/dashboard";

/**
 * Seller workspace shell in the quiet, Mercury-style look (Mock 2): a white sidebar, a top bar with
 * search and a hide-amounts toggle, and pages on a near-white canvas.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // counts come from live Supabase rows
  const session = await requireSession();
  const { disputes } = await getHomeDataCached(sellerScope(session));
  const accountName = session.kind === "seller" ? session.name : "Demo account";
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "S";
  const needsResponse = disputes.filter((d) => d.status === "WAITING_FOR_SELLER_RESPONSE").length;
  const mode = sessionMode(session);
  // Team-only tools (Evals) stay out of the seller's sidebar unless SHOW_INTERNAL_TOOLS=true.
  const showInternal = process.env.SHOW_INTERNAL_TOOLS === "true";

  return (
    <div className="theme-app flex min-h-full flex-1 bg-subtle text-fg [color-scheme:light]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-line bg-canvas px-3.5 pt-5 pb-5 lg:flex">
        <Link href="/dashboard" className="px-2.5" aria-label="Sira dashboard home">
          <Logo />
        </Link>

        <nav aria-label="Workspace" className="mt-7 flex flex-col gap-0.5">
          <NavLink href="/dashboard" exact icon={<House strokeWidth={1.6} />}>
            Home
          </NavLink>
          <NavLink href="/disputes" icon={<Inbox strokeWidth={1.6} />} badge={needsResponse}>
            Disputes
          </NavLink>
          <NavLink href="/evidence" icon={<FileText strokeWidth={1.6} />}>
            Shipping proof
          </NavLink>
          <NavLink href="/insights" icon={<ChartNoAxesColumn strokeWidth={1.6} />}>
            Insights
          </NavLink>
          <NavLink href="/settings" icon={<SlidersHorizontal strokeWidth={1.6} />}>
            Settings
          </NavLink>
        </nav>

        {showInternal && (
          <nav aria-label="Internal" className="mt-6 flex flex-col gap-0.5 border-t border-line pt-4">
            <NavLink href="/evals" icon={<FlaskConical strokeWidth={1.6} />}>
              Evals
            </NavLink>
          </nav>
        )}

        <div className="mt-auto flex flex-col gap-3">
          <p className="px-2.5 text-[12px] leading-[18px] text-fg-muted">
            {mode === "live" ? "Live · approvals reach PayPal" : "Demo mode · nothing is sent to PayPal"}
          </p>
          <div className="border-t border-line pt-3">
            <AccountMenu name={accountName} initials={initials} variant="sidebar" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line bg-subtle/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-5 md:px-8">
            <Link href="/dashboard" className="lg:hidden" aria-label="Sira dashboard home">
              <Logo />
            </Link>
            {/* Search jumps to the disputes list, filtered */}
            <form action="/disputes" role="search" className="hidden max-w-[560px] flex-1 md:block">
              <label className="flex h-10 items-center gap-2.5 rounded-md border border-line bg-canvas px-3.5 focus-within:border-line-strong">
                <Search aria-hidden strokeWidth={1.8} className="size-4 text-fg-muted" />
                <span className="sr-only">Search disputes</span>
                <input
                  type="search"
                  name="q"
                  placeholder="Search buyer, item or dispute ID"
                  className="h-full flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-muted"
                />
              </label>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <HideAmounts />
              <Link
                href="/disputes?view=needs-response"
                aria-label={`${needsResponse} disputes need a response`}
                className="relative inline-flex size-10 items-center justify-center rounded-md bg-muted text-fg-body transition-colors hover:bg-inset hover:text-fg"
              >
                <Bell strokeWidth={1.6} className="size-[17px]" />
                {needsResponse > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full border-2 border-muted bg-accent" />}
              </Link>
              {/* On desktop the account lives at the bottom of the sidebar */}
              <div className="lg:hidden">
                <AccountMenu name={accountName} initials={initials} variant="compact" />
              </div>
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
    </div>
  );
}
