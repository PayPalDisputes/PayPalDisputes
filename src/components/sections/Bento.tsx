import { FlaskConical, GitBranch, LayoutGrid, ListTree } from "lucide-react";
import { bento } from "@/data/home";
import { cn } from "@/lib/cn";
import { Section, SectionHeading } from "../layout/Container";
import { Reveal } from "../motion/Reveal";
import { CaseProfile } from "../product/Animated";
import { ApprovalChip, MiniChart, WebhookFeed } from "../product/Cards";
import { Badge, IconTile } from "../ui/primitives";

/** One cell of the joined grid: title + body on top, a visual underneath. No card chrome; the grid lines do the work. */
function Cell({
  title,
  body,
  children,
  className,
  delay = 0,
}: {
  title: React.ReactNode;
  body: string;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-8 px-5 py-10 sm:px-8 md:px-10 md:py-12", className)}>
      <Reveal delay={delay}>
        <h3 className="text-[18px] font-medium tracking-[-0.01em] text-fg-heading">{title}</h3>
        <p className="t-small mt-2 max-w-[400px] text-[14px] leading-[22px]">{body}</p>
      </Reveal>
      {children && (
        <Reveal delay={delay + 80} className="mt-auto">
          {children}
        </Reveal>
      )}
    </div>
  );
}

const deadlineBuckets = [
  { label: "0-1", value: 1, tone: "bad" as const },
  { label: "2-3", value: 2, tone: "bad" as const },
  { label: "4-5", value: 3, tone: "warn" as const },
  { label: "6-7", value: 2, tone: "warn" as const },
  { label: "8-10", value: 4 },
  { label: "11-14", value: 3 },
  { label: "15-20", value: 2 },
];

export function Bento() {
  return (
    <Section id={bento.id} hatched innerClassName="p-0">
      <div className="px-5 py-20 md:py-24">
        <Reveal>
          <SectionHeading eyebrow={bento.eyebrow} eyebrowIcon={<LayoutGrid strokeWidth={1.75} />} title={bento.title} body={bento.body} />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 border-t border-line md:grid-cols-2 [&>*]:border-line max-md:[&>*+*]:border-t md:[&>*:nth-child(2n)]:border-l md:[&>*:nth-child(n+3)]:border-t">
        <Cell title="The whole case on one page" body="Claim, order, buyer messages and history side by side, so the recommendation is easy to check.">
          <CaseProfile />
        </Cell>

        <Cell
          delay={60}
          title="You have the final say"
          body="The agent drafts the response. You read it, edit it, and decide whether it goes to PayPal."
        >
          <div className="rounded-2xl border border-line bg-canvas p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-fg">Draft ready for review</span>
              <Badge tone="info" dot>
                Waiting for you
              </Badge>
            </div>
            <p className="mt-3 rounded-lg bg-subtle px-3 py-2.5 text-[12.5px] leading-[19px] text-fg-heading">
              The order was delivered by UPS on Oct 2 to the address on the PayPal transaction. Tracking and proof of delivery
              are attached.
            </p>
            <div className="mt-4 flex justify-end">
              <ApprovalChip />
            </div>
          </div>
        </Cell>

        <Cell title="Deadline radar" body="Open disputes by days left to respond. The left side is where PayPal decides soon.">
          <div className="rounded-2xl border border-line bg-canvas p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] text-fg-muted">Open disputes by days left</span>
              <Badge tone="bad">3 urgent</Badge>
            </div>
            <MiniChart data={deadlineBuckets} />
          </div>
        </Cell>

        <Cell
          delay={60}
          title="Runs on PayPal's own events"
          body="New disputes arrive by webhook and sync straight into your queue, so nothing waits on a manual export."
        >
          <WebhookFeed />
        </Cell>
      </div>

      <div className="grid grid-cols-1 border-t border-line md:grid-cols-3 max-md:[&>*+*]:border-t md:[&>*+*]:border-l [&>*]:border-line">
        <SmallCell icon={<ListTree strokeWidth={1.6} className="size-4" />} title="All 10 dispute reasons" body="Item not received to canceled subscriptions, at every lifecycle stage." />
        <SmallCell delay={70} icon={<GitBranch strokeWidth={1.6} className="size-4" />} title="Versioned and evaluated" body="Each assessment records its prompt version and is tested against saved cases." />
        <SmallCell delay={140} icon={<FlaskConical strokeWidth={1.6} className="size-4" />} title="Demo mode" body="Walk through approvals end to end without contacting PayPal." />
      </div>
    </Section>
  );
}

function SmallCell({ icon, title, body, delay = 0 }: { icon: React.ReactNode; title: string; body: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="min-w-0 px-5 py-9 sm:px-8 md:px-10">
      <IconTile>{icon}</IconTile>
      <h3 className="mt-5 text-[15px] font-medium text-fg-heading">{title}</h3>
      <p className="t-small mt-1">{body}</p>
    </Reveal>
  );
}
