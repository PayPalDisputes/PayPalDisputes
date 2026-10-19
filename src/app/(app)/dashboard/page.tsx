import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, Clock3, ExternalLink, FileCheck2, Inbox, ListTree, MessageSquareWarning } from "lucide-react";
import { DeadlineChart, ReasonChart, RecommendationChart, type Bucket } from "@/components/app/Charts";
import { RollingNumber } from "@/components/motion/RollingNumber";
import { Badge, DecisionBadge } from "@/components/ui/primitives";
import { formatAmount, reasonLabel, StatusBadge } from "@/app/_components/dispute-ui";
import { requireSession } from "@/lib/auth";
import { getHomeDataCached, type HomeDispute } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Home · Kaleshi" };

const RESOLUTION_CENTER = (process.env.PAYPAL_API_BASE ?? "").includes("sandbox") || !process.env.PAYPAL_API_BASE
  ? "https://www.sandbox.paypal.com/disputes/"
  : "https://www.paypal.com/disputes/";

const isOpen = (d: HomeDispute) => d.status !== "RESOLVED";
const needsResponse = (d: HomeDispute) => d.status === "WAITING_FOR_SELLER_RESPONSE";
const awaitingApproval = (d: HomeDispute) => isOpen(d) && d.report?.status === "pending_review" && d.report.current;

/** "$1,982.40" → ["$", "1,982.40"], "CA$2,140.00" → ["CA$", "2,140.00"]. */
function splitCurrency(amount: number, currency: string) {
  const formatted = formatAmount(amount, currency);
  const m = formatted.match(/^([^\d]*)(.*)$/);
  return [m?.[1] ?? "", m?.[2] ?? formatted] as const;
}

export default async function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  await connection();
  const session = await requireSession();
  const { seller } = await searchParams;
  const sellerId = session.kind === "seller" ? session.sellerId : typeof seller === "string" ? seller : undefined;
  const { disputes, sellers: allSellers } = await getHomeDataCached(sellerId);
  const sellers = session.kind === "seller" ? allSellers.filter((s) => s.id === session.sellerId) : allSellers;
  const store = sellers.find((s) => s.id === sellerId);

  const open = disputes.filter(isOpen);
  const respond = disputes.filter(needsResponse);
  const approvals = disputes.filter(awaitingApproval);
  const won = disputes.filter((d) => d.outcome === "RESOLVED_SELLER_FAVOUR").length;
  const lost = disputes.filter((d) => d.outcome === "RESOLVED_BUYER_FAVOUR").length;

  // Amount at risk = what buyers are claiming on open disputes, per currency (no conversion).
  const totals = new Map<string, number>();
  for (const d of open) totals.set(d.currency ?? "USD", (totals.get(d.currency ?? "USD") ?? 0) + (d.amount ?? 0));
  const byCurrency = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const [headCurrency, headTotal] = byCurrency[0] ?? ["USD", 0];
  const [symbol, digits] = splitCurrency(headTotal, headCurrency);

  // Chart data, all from the same rows the rest of the page uses.
  const buckets: Bucket[] = [
    { label: "Overdue", test: (n: number) => n < 0, urgent: true },
    { label: "0–3 days", test: (n: number) => n >= 0 && n <= 3, urgent: true },
    { label: "4–7 days", test: (n: number) => n >= 4 && n <= 7, urgent: false },
    { label: "8–14 days", test: (n: number) => n >= 8 && n <= 14, urgent: false },
    { label: "15+ days", test: (n: number) => n >= 15, urgent: false },
  ].map(({ label, test, urgent }) => ({ label, urgent, value: respond.filter((d) => d.daysLeft !== null && test(d.daysLeft)).length }));
  const reasonCounts = new Map<string, number>();
  for (const d of open) reasonCounts.set(reasonLabel(d.reason), (reasonCounts.get(reasonLabel(d.reason)) ?? 0) + 1);
  const reasons = [...reasonCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const mix = (["fight", "settle", "refund"] as const).map((rec) => ({
    label: ({ fight: "Fight", settle: "Settle", refund: "Refund" } as const)[rec],
    value: open.filter((d) => d.report?.recommendation === rec && d.report.current).length,
  }));

  const nextDeadline = respond
    .filter((d) => d.daysLeft !== null)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-20 md:px-10 md:pt-10">
      {/* Store selector, like PayPal's business name in the page header */}
      <StoreSelector stores={sellers} current={store} />

      {/* Headline number */}
      <section aria-labelledby="at-risk" className="mt-8">
        <p className="flex items-baseline gap-2 font-serif text-[56px] leading-none text-fg md:text-[76px]">
          <RollingNumber value={digits} prefix={symbol} delay={150} stagger={120} />
          <span className="font-sans text-[18px] font-medium text-fg-heading md:text-[20px]">{headCurrency}</span>
        </p>
        <h1 id="at-risk" className="mt-3 text-[15px] text-fg-body">
          At risk in {open.length} open dispute{open.length === 1 ? "" : "s"}
        </h1>
        {byCurrency.length > 1 && (
          <p className="mt-1.5 text-[13px] text-fg-muted">
            Also{" "}
            {byCurrency
              .slice(1)
              .map(([c, t]) => `${formatAmount(t, c)} ${c}`)
              .join(" · ")}
          </p>
        )}
        <p className="mt-4 text-[12px] text-fg-muted">* What buyers are claiming on disputes that are still open. Nothing has been refunded.</p>
      </section>

      {/* Alert cards */}
      <section aria-label="Needs attention" className="mt-10 grid gap-4 md:grid-cols-2">
        <AlertCard
          icon={<FileCheck2 strokeWidth={1.6} />}
          href="/disputes?view=approval"
          title={
            approvals.length === 0
              ? "No drafts waiting for you"
              : `${approvals.length} draft${approvals.length === 1 ? "" : "s"} waiting for your approval`
          }
          body={
            approvals.length === 0
              ? "When the agent drafts a response, it lands here for you to review."
              : "Read, edit and approve each response. Nothing goes to PayPal until you do."
          }
          tone={approvals.length > 0 ? "accent" : "neutral"}
        />
        <AlertCard
          icon={<Clock3 strokeWidth={1.6} />}
          href={nextDeadline ? `/disputes/${nextDeadline.id}` : "/disputes"}
          title={
            nextDeadline
              ? nextDeadline.daysLeft! < 0
                ? "A response deadline has passed"
                : nextDeadline.daysLeft === 0
                  ? "A response is due today"
                  : `Next deadline in ${nextDeadline.daysLeft} day${nextDeadline.daysLeft === 1 ? "" : "s"}`
              : "No response deadlines coming up"
          }
          body={
            nextDeadline
              ? `${nextDeadline.buyerName ?? "Buyer"} · ${reasonLabel(nextDeadline.reason)} · ${formatAmount(nextDeadline.amount, nextDeadline.currency)}`
              : "PayPal isn't waiting on you for anything right now."
          }
          tone={nextDeadline && (nextDeadline.daysLeft ?? 99) <= 3 ? "bad" : "neutral"}
        />
      </section>

      {/* Quick access */}
      <section aria-labelledby="quick-access" className="mt-12">
        <h2 id="quick-access" className="text-[15px] font-semibold text-fg">
          Quick access
        </h2>
        <ul className="mt-5 grid grid-cols-3 gap-y-6 sm:grid-cols-5 md:flex md:gap-10">
          <QuickLink href="/disputes?view=approval" icon={<FileCheck2 strokeWidth={1.5} />} label="Review drafts" />
          <QuickLink href="/disputes?view=needs-response" icon={<MessageSquareWarning strokeWidth={1.5} />} label="Needs response" />
          <QuickLink href="/disputes" icon={<ListTree strokeWidth={1.5} />} label="All disputes" />
          <QuickLink href="/disputes?view=resolved" icon={<Inbox strokeWidth={1.5} />} label="Resolved" />
          <QuickLink href={RESOLUTION_CENTER} external icon={<ExternalLink strokeWidth={1.5} />} label="Open in PayPal" />
        </ul>
      </section>

      {/* Performance */}
      <section aria-labelledby="performance" className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="performance" className="text-[15px] font-semibold text-fg">
              Dispute performance
            </h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">All time{store ? ` · ${store.name}` : ""}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Open disputes" value={open.length} href="/disputes" />
          <StatCard label="Needs your response" value={respond.length} href="/disputes?view=needs-response" />
          <StatCard label="Won" value={won} hint="Resolved in your favour" />
          <StatCard label="Lost" value={lost} hint="Resolved for the buyer" />
        </div>
      </section>

      {/* Insights */}
      <section aria-labelledby="insights" className="mt-12">
        <h2 id="insights" className="text-[15px] font-semibold text-fg">
          Insights
        </h2>
        <p className="mt-0.5 text-[12.5px] text-fg-muted">Open disputes right now{store ? ` · ${store.name}` : ""}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <DeadlineChart buckets={buckets} />
          <ReasonChart reasons={reasons} />
          <RecommendationChart mix={mix} />
        </div>
      </section>

      {/* Recent disputes */}
      <section aria-labelledby="recent" className="mt-12">
        <div className="flex items-end justify-between">
          <h2 id="recent" className="text-[15px] font-semibold text-fg">
            Recent disputes
          </h2>
          <Link href="/disputes" className="inline-flex items-center gap-1 text-[13px] font-medium text-fg underline-offset-4 hover:underline">
            View all <ArrowRight strokeWidth={1.75} className="size-3.5" />
          </Link>
        </div>
        <RecentTable disputes={disputes.slice(0, 6)} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StoreSelector({ stores, current }: { stores: { id: string; name: string }[]; current?: { id: string; name: string } }) {
  const title = current?.name ?? "All stores";
  if (stores.length < 2) return <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-fg">{stores[0]?.name ?? title}</h2>;
  return (
    <details className="group relative inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg text-[24px] font-semibold tracking-[-0.01em] text-fg [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown strokeWidth={1.75} className="size-5 text-fg-muted transition-transform group-open:rotate-180" />
      </summary>
      <ul className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-line bg-canvas p-1.5 shadow-float">
        {[{ id: "", name: "All stores" }, ...stores].map((s) => (
          <li key={s.id || "all"}>
            <Link
              href={s.id ? `/dashboard?seller=${encodeURIComponent(s.id)}` : "/dashboard"}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-[14px] text-fg-heading hover:bg-subtle"
            >
              {s.name}
              {(current?.id ?? "") === s.id && <span className="size-1.5 rounded-full bg-fg" />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function AlertCard({
  icon,
  href,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  href: string;
  title: string;
  body: string;
  tone: "neutral" | "accent" | "bad";
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl border border-line bg-canvas p-5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-card"
    >
      <span
        className={
          "flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5 " +
          (tone === "accent" ? "bg-fg text-white" : tone === "bad" ? "bg-bad-bg text-bad" : "bg-subtle text-fg-heading")
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-fg underline-offset-4 group-hover:underline">{title}</span>
        <span className="mt-1 block text-[13px] leading-5 text-fg-body">{body}</span>
      </span>
    </Link>
  );
}

function QuickLink({ href, icon, label, external }: { href: string; icon: React.ReactNode; label: string; external?: boolean }) {
  const content = (
    <>
      <span className="flex size-14 items-center justify-center rounded-full bg-subtle text-fg-heading ring-1 ring-line transition-[background-color,box-shadow] duration-200 group-hover:bg-canvas group-hover:shadow-card [&>svg]:size-[22px]">
        {icon}
      </span>
      <span className="text-center text-[12.5px] leading-4 text-fg-body group-hover:text-fg">{label}</span>
    </>
  );
  const className = "group flex w-[88px] flex-col items-center gap-2.5 justify-self-center";
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      ) : (
        <Link href={href} className={className}>
          {content}
        </Link>
      )}
    </li>
  );
}

function StatCard({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const inner = (
    <>
      <span className="text-[13px] font-medium text-fg-heading">{label}</span>
      <span className="mt-3 block font-serif text-[40px] leading-none text-fg tabular-nums">{value}</span>
      {hint && <span className="mt-2 block text-[12px] text-fg-muted">{hint}</span>}
    </>
  );
  const className = "block rounded-2xl border border-line bg-canvas p-5 transition-[border-color,box-shadow] duration-200";
  return href ? (
    <Link href={href} className={className + " hover:border-line-strong hover:shadow-card"}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function RecentTable({ disputes }: { disputes: HomeDispute[] }) {
  if (disputes.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-10 text-center text-[14px] text-fg-body">
        No disputes yet. They appear here as soon as PayPal sends them.
      </p>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[720px] text-left text-[13.5px]">
        <thead className="bg-subtle text-[12.5px] text-fg-body">
          <tr>
            <th className="px-5 py-3.5 font-medium">Date</th>
            <th className="px-4 py-3.5 font-medium">Buyer</th>
            <th className="px-4 py-3.5 font-medium">Reason</th>
            <th className="px-4 py-3.5 font-medium">Status</th>
            <th className="px-4 py-3.5 font-medium">Recommendation</th>
            <th className="px-5 py-3.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {disputes.map((d) => (
            <tr key={d.id} className="group relative transition-colors hover:bg-subtle/60">
              <td className="px-5 py-3.5 whitespace-nowrap text-fg-body">
                {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </td>
              <td className="px-4 py-3.5">
                {/* the whole row is clickable through this stretched link */}
                <Link href={`/disputes/${d.id}`} className="font-medium text-fg after:absolute after:inset-0">
                  {d.buyerName ?? "Unknown buyer"}
                </Link>
                {d.sellerName && <span className="block text-[12px] text-fg-muted">{d.sellerName}</span>}
              </td>
              <td className="px-4 py-3.5 text-fg-body">{reasonLabel(d.reason)}</td>
              <td className="px-4 py-3.5">
                <StatusBadge status={d.status} />
              </td>
              <td className="px-4 py-3.5">
                {d.report?.recommendation ? (
                  <span className="inline-flex items-center gap-2">
                    <DecisionBadge decision={d.report.recommendation} />
                    {d.report.status === "pending_review" && d.report.current && isOpen(d) && <Badge tone="info">Needs approval</Badge>}
                  </span>
                ) : (
                  <span className="text-fg-muted">Not assessed</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-right font-medium whitespace-nowrap text-fg tabular-nums">{formatAmount(d.amount, d.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
