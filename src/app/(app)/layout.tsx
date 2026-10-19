import Link from "next/link";
import { connection } from "next/server";
import { Bell, FileText, FlaskConical, House, Inbox, Settings, Store } from "lucide-react";
import { NavLink } from "@/components/app/NavLink";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getHomeDataCached } from "@/lib/dashboard";

/**
 * Seller workspace shell, laid out like the PayPal business dashboard sellers already know
 * (sidebar, top bar, content) but in Kaleshi's own branding.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection(); // counts come from live Supabase rows
  const session = await requireSession();
  const { disputes } = await getHomeDataCached(sellerScope(session));
  const accountName = session.kind === "seller" ? session.name : "Demo account";
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "K";
  const needsResponse = disputes.filter((d) => d.status === "WAITING_FOR_SELLER_RESPONSE").length;
  const awaitingApproval = disputes.filter(
    (d) => d.status !== "RESOLVED" && d.report?.status === "pending_review" && d.report.current,
  ).length;
  const mode = sessionMode(session);
  // Team-only tools (Evals) stay out of the seller's sidebar unless SHOW_INTERNAL_TOOLS=true.
  const showInternal = process.env.SHOW_INTERNAL_TOOLS === "true";

  return (
    <div className="flex min-h-full flex-1 bg-canvas text-fg [color-scheme:light]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-subtle px-4 pt-6 pb-5 lg:flex">
        <Link href="/dashboard" className="px-3" aria-label="Kaleshi dashboard home">
          <Logo />
        </Link>
        <Button href="/disputes?view=approval" size="md" className="mt-7 w-full">
          Review drafts
          {awaitingApproval > 0 && (
            <span className="rounded-full bg-white/15 px-1.5 text-[11px] leading-4 tabular-nums">{awaitingApproval}</span>
          )}
        </Button>

        <nav aria-label="Workspace" className="mt-6 flex flex-col gap-1">
          <NavLink href="/dashboard" exact icon={<House strokeWidth={1.6} />}>
            Home
          </NavLink>
          <NavLink href="/disputes" icon={<Inbox strokeWidth={1.6} />} badge={needsResponse}>
            Disputes
          </NavLink>
        </nav>

        {showInternal && (
          <>
            <p className="mt-7 px-3 text-[11px] font-medium tracking-[0.04em] text-fg-muted uppercase">Internal</p>
            <nav aria-label="Internal" className="mt-2 flex flex-col gap-1">
              <NavLink href="/evals" icon={<FlaskConical strokeWidth={1.6} />}>
                Evals
              </NavLink>
            </nav>
          </>
        )}

        <p className="mt-7 px-3 text-[11px] font-medium tracking-[0.04em] text-fg-muted uppercase">Coming soon</p>
        <ul className="mt-2 flex flex-col gap-1" aria-label="Coming soon">
          {[
            { label: "Evidence", icon: FileText },
            { label: "Stores", icon: Store },
            { label: "Settings", icon: Settings },
          ].map(({ label, icon: Icon }) => (
            <li key={label} className="flex h-10 cursor-default items-center gap-3 px-3 text-[14px] text-fg-muted/70">
              <Icon strokeWidth={1.6} className="size-[18px]" />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 px-1">
          <ModeBadge mode={mode} />
          <Link href="/" className="block px-2 text-[12.5px] text-fg-muted hover:text-fg">
            ← kaleshi.com
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-4 px-5 md:px-8">
            <Link href="/dashboard" className="lg:hidden" aria-label="Kaleshi dashboard home">
              <Logo />
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:block lg:hidden">
                <ModeBadge mode={mode} />
              </span>
              <Link
                href="/disputes?view=needs-response"
                aria-label={`${needsResponse} disputes need a response`}
                className="relative inline-flex size-10 items-center justify-center rounded-full text-fg-heading transition-colors hover:bg-muted"
              >
                <Bell strokeWidth={1.6} className="size-5" />
                {needsResponse > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums">
                    {needsResponse}
                  </span>
                )}
              </Link>
              <span className="h-6 w-px bg-line" aria-hidden />
              <span
                title={accountName}
                aria-label={`Signed in as ${accountName}`}
                className="inline-flex size-9 items-center justify-center rounded-full bg-[#e8dccf] text-[12px] font-semibold text-fg-heading"
              >
                {initials}
              </span>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="rounded-full px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:bg-muted hover:text-fg">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          {/* Section tabs (mobile / tablet) */}
          <nav aria-label="Workspace" className="flex gap-6 border-t border-line px-5 md:px-8 lg:hidden">
            <NavLink href="/dashboard" exact variant="tab">
              Home
            </NavLink>
            <NavLink href="/disputes" variant="tab" badge={needsResponse}>
              Disputes
            </NavLink>
            {showInternal && (
              <NavLink href="/evals" variant="tab">
                Evals
              </NavLink>
            )}
          </nav>
        </header>

        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function ModeBadge({ mode }: { mode: "live" | "demo" }) {
  return mode === "live" ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-[12px] text-fg-body">
      <span className="size-1.5 rounded-full bg-ok" /> Live: approvals reach PayPal
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1 text-[12px] text-fg-body">
      <span className="size-1.5 rounded-full bg-warn" /> Demo mode: nothing is sent
    </span>
  );
}
