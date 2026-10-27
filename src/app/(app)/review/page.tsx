import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft } from "lucide-react";
import { formatAmount, reasonLabel } from "@/app/_components/dispute-ui";
import { requireSession, sellerScope, sessionMode } from "@/lib/auth";
import { getDisputeDetail, getHomeDataCached, type HomeDispute } from "@/lib/dashboard";
import { callLabel, dueLabel } from "@/lib/dispute-stage";
import { ReviewDeck, type ReviewCard } from "./review-deck";

export const metadata: Metadata = { title: "Review drafts · Sira" };

const draftReady = (d: HomeDispute) => d.status !== "RESOLVED" && d.report?.status === "pending_review" && d.report.current;

/** Review mode: every draft waiting for approval, one at a time, most urgent first (Mock 2). */
export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  await connection();
  const session = await requireSession();
  const { i } = await searchParams;
  const { disputes } = await getHomeDataCached(sellerScope(session));
  const queue = disputes.filter(draftReady).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  const index = Math.max(0, Math.min(Number(typeof i === "string" ? i : 0) || 0, queue.length));
  const current = queue[index];
  const next = queue[index + 1];
  const mode = sessionMode(session);

  const detail = current ? await getDisputeDetail(current.id) : null;
  const decision = detail?.decision ?? null;
  const card: ReviewCard | null =
    detail && decision
      ? (() => {
          const a = decision.assessment;
          const o = detail.order;
          const delivery = !o
            ? "No order record in Sira."
            : o.shippingStatus === "DELIVERED"
              ? `Delivered${o.deliveredAt ? ` ${new Date(o.deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""} by ${o.carrier ?? "the carrier"}${o.signatureConfirmed ? ", signed for" : ""}.`
              : o.trackingNumber
                ? `Shipped with ${o.carrier ?? "the carrier"}${o.shippedAt ? ` on ${new Date(o.shippedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}, not delivered yet.`
                : "Shipped without a tracking number.";
          const facts: { label: string; value: string }[] = [
            { label: "Delivery", value: delivery },
            ...(detail.buyerHistory ? [{ label: "Buyer history", value: detail.buyerHistory.summary }] : []),
            ...a.key_evidence.slice(0, 3).map((value, n) => ({ label: n === 0 ? "Supports" : "", value })),
            ...a.missing_evidence.slice(0, 2).map((value, n) => ({ label: n === 0 ? "Missing" : "", value })),
          ];
          const amount = formatAmount(detail.amount, detail.currency);
          const offer = a.settle_amount != null ? formatAmount(a.settle_amount, detail.currency) : null;
          return {
            disputeId: detail.id,
            decisionId: decision.id,
            buyerName: detail.raw.disputed_transactions?.[0]?.buyer?.name ?? "Buyer",
            item: detail.raw.disputed_transactions?.[0]?.items?.[0]?.item_name ?? "Order",
            meta: [
              reasonLabel(detail.reason),
              detail.raw.create_time ? `opened ${new Date(detail.raw.create_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null,
              dueLabel(detail.daysLeft)?.toLowerCase(),
            ]
              .filter(Boolean)
              .join(" · "),
            amount: detail.amount,
            currency: detail.currency,
            recommendation: a.recommendation,
            call: a.recommendation === "refund" ? `Refund ${amount}` : (callLabel({ recommendation: a.recommendation, settleAmount: a.settle_amount }, detail.currency) ?? ""),
            summary: a.reasoning,
            facts,
            drafts: a.drafts,
            refundAmount: amount,
            offerAmount: offer,
          };
        })()
      : null;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-4 border-b border-line bg-canvas px-5 py-3.5 md:px-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[14px] text-fg-body hover:text-fg">
          <ChevronLeft aria-hidden strokeWidth={1.7} className="size-4" />
          Home
        </Link>
        <span className="flex-1 text-center text-[14px] text-fg-muted tabular-nums">
          {current ? `Draft ${index + 1} of ${queue.length}` : queue.length ? "Done" : "No drafts"}
        </span>
        <span className="text-[12.5px] text-fg-muted">{mode === "live" ? "Live · approvals reach PayPal" : "Demo mode · nothing is sent"}</span>
      </div>
      <div role="progressbar" aria-label="Drafts reviewed" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index} className="h-0.5 bg-line">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${queue.length ? (Math.min(index, queue.length) / queue.length) * 100 : 0}%` }} />
      </div>

      {card ? (
        <ReviewDeck
          key={card.decisionId}
          card={card}
          mode={mode}
          nextHref={`/review?i=${index + 1}`}
          upNext={next ? { name: next.buyerName ?? "Buyer", amount: formatAmount(next.amount, next.currency) } : null}
        />
      ) : (
        <section aria-labelledby="done-title" className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-8 py-20">
          <h1 id="done-title" className="text-[28px] font-[480] tracking-[0.01em] text-fg">
            {queue.length ? "All caught up" : "Nothing to review"}
          </h1>
          <p className="max-w-[520px] text-[16px] leading-[26px] text-fg-body">
            {queue.length
              ? "You've been through every draft. Sira will let you know when a buyer replies or a new dispute comes in."
              : "When Sira drafts a response, it lands here for you to approve. Nothing goes to PayPal until you do."}
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full bg-fg px-[18px] text-[14px] text-white hover:bg-fg/90">
              Back to home
            </Link>
            {queue.length > 0 && (
              <Link href="/review" className="inline-flex h-10 items-center rounded-full bg-muted px-[18px] text-[14px] text-fg hover:bg-inset">
                Review again
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
