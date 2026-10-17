import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  House,
  Inbox,
  KeyRound,
  LifeBuoy,
  ListFilter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Store,
  Users,
  Webhook,
} from "lucide-react";
import { currencySymbol, mockDisputes, sidebarNav, type MockDispute } from "@/data/dashboard";
import { cn } from "@/lib/cn";
import { Avatar, DaysLeft, DecisionBadge, Kbd, StatusBadge } from "../ui/primitives";

/* ------------------------------------------------------------------ */
/* DashboardWindow: the outer app frame                                */
/* ------------------------------------------------------------------ */

/**
 * Outer chrome for product mockups: a soft tray with a white app surface inside.
 * Purely presentational; mark it aria-hidden or give it a label where it's used.
 */
export function DashboardWindow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[18px] border border-line bg-muted/60 p-1.5 shadow-card md:p-2", className)}>
      <div className="overflow-hidden rounded-[12px] border border-line bg-canvas shadow-[0_1px_2px_rgba(28,25,20,0.05)]">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const sidebarIcons = {
  home: House,
  inbox: Inbox,
  package: Package,
  file: FileText,
  store: Store,
  key: KeyRound,
  webhook: Webhook,
  users: Users,
} as const;

export function DashboardSidebar({ active = "Disputes" }: { active?: string }) {
  return (
    <aside className="hidden w-[192px] shrink-0 flex-col border-r border-line bg-subtle/60 md:flex">
      <div className="flex flex-col gap-0.5 p-2.5">
        <SidebarRow icon={<Search strokeWidth={1.6} className="size-3.5" />} label="Search" trailing={<Kbd>⌘K</Kbd>} />
      </div>
      <div className="mx-2.5 mb-2 flex items-center gap-2 rounded-lg border border-line bg-canvas p-1.5 shadow-[0_1px_1px_rgba(28,25,20,0.04)]">
        <span className="flex size-5 items-center justify-center rounded-[5px] bg-[#d9d4c7] text-[10px] font-semibold text-fg-heading">N</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg">Northwind Goods</span>
        <ChevronsUpDown strokeWidth={1.6} className="size-3 text-fg-muted" />
      </div>
      <nav className="flex flex-col gap-0.5 px-2.5">
        {sidebarNav.map((item) => {
          const Icon = sidebarIcons[item.icon];
          return (
            <SidebarRow
              key={item.label}
              active={item.label === active}
              icon={<Icon strokeWidth={1.6} className="size-3.5" />}
              label={item.label}
              trailing={"badge" in item ? <span className="text-[10.5px] tabular-nums text-fg-muted">{item.badge}</span> : null}
            />
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-line p-2.5">
        <SidebarRow icon={<LifeBuoy strokeWidth={1.6} className="size-3.5" />} label="Support" />
        <SidebarRow icon={<Settings strokeWidth={1.6} className="size-3.5" />} label="Settings" />
      </div>
    </aside>
  );
}

function SidebarRow({
  icon,
  label,
  trailing,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-[12px]",
        active ? "bg-inset/80 font-medium text-fg" : "text-fg-body",
      )}
    >
      <span className={active ? "text-fg" : "text-fg-muted"}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar / toolbar                                                    */
/* ------------------------------------------------------------------ */

export function DashboardTopbar({ title = "Disputes", count = 12 }: { title?: string; count?: number }) {
  return (
    <div className="flex h-11 items-center gap-1.5 border-b border-line px-3">
      <span className="mr-1 text-[12.5px] font-medium text-fg">{title}</span>
      <span className="rounded-[5px] bg-muted px-1.5 text-[10.5px] leading-[18px] tabular-nums text-fg-body">{count}</span>
      <span className="mx-1.5 h-4 w-px bg-line" />
      <ToolbarButton label="Filter">
        <ListFilter strokeWidth={1.6} className="size-3.5" />
        <span className="hidden lg:inline">Filter</span>
      </ToolbarButton>
      <ToolbarButton label="Sort">
        <ArrowUpDown strokeWidth={1.6} className="size-3.5" />
        <span className="hidden lg:inline">Deadline</span>
      </ToolbarButton>
      <div className="ml-auto flex items-center gap-1">
        <ToolbarIcon label="Previous page">
          <ChevronLeft strokeWidth={1.6} className="size-3.5" />
        </ToolbarIcon>
        <ToolbarIcon label="Next page">
          <ChevronRight strokeWidth={1.6} className="size-3.5" />
        </ToolbarIcon>
        <ToolbarIcon label="Refresh">
          <RefreshCw strokeWidth={1.6} className="size-3.5" />
        </ToolbarIcon>
        <span className="ml-1 inline-flex h-6 items-center gap-1 rounded-md bg-fg px-2 text-[11px] font-medium text-white shadow-[inset_0_0.75px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)]">
          <Plus strokeWidth={2} className="size-3" />
          <span className="hidden whitespace-nowrap lg:inline">Sync PayPal</span>
        </span>
      </div>
    </div>
  );
}

function ToolbarButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span title={label} className="inline-flex h-6 items-center gap-1 rounded-md border border-line px-1.5 text-[11px] text-fg-body">
      {children}
    </span>
  );
}
function ToolbarIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span title={label} className="inline-flex size-6 items-center justify-center rounded-md border border-line text-fg-muted">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* DisputeTable (the DataTable for disputes)                           */
/* ------------------------------------------------------------------ */

export function DisputeTable({
  rows = mockDisputes,
  selectedId,
  className,
}: {
  rows?: MockDispute[];
  selectedId?: string;
  className?: string;
}) {
  return (
    <table className={cn("w-full table-fixed text-left text-[12px]", className)}>
      <thead>
        <tr className="h-8 border-b border-line text-[11px] text-fg-muted">
          <th className="w-[72px] pl-3 font-normal">Opened</th>
          <th className="font-normal">Buyer</th>
          <th className="w-[92px] pr-3 text-right font-normal">Amount</th>
          <th className="hidden w-[68px] font-normal lg:table-cell">Decision</th>
          <th className="hidden w-[112px] font-normal sm:table-cell">Status</th>
          <th className="w-[48px] pr-3 text-right font-normal">Due</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr
            key={d.id}
            className={cn("h-11 border-b border-line-subtle", d.id === selectedId ? "bg-subtle" : "")}
          >
            <td className="pl-3 whitespace-nowrap text-fg-muted tabular-nums">{d.opened}</td>
            <td className="pr-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={d.buyer} size={20} />
                <span className="min-w-0">
                  <span className="block truncate leading-4 text-fg">{d.buyer}</span>
                  <span className="block truncate text-[10.5px] leading-4 text-fg-muted">{d.reason}</span>
                </span>
              </span>
            </td>
            <td className="pr-3 text-right font-mono text-[11.5px] whitespace-nowrap tabular-nums text-fg">
              {currencySymbol[d.currency]}
              {d.amount}
            </td>
            <td className="hidden lg:table-cell">
              <DecisionBadge decision={d.decision} />
            </td>
            <td className="hidden sm:table-cell">
              <StatusBadge status={d.status} />
            </td>
            <td className="pr-3 text-right text-[11.5px]">
              <DaysLeft days={d.daysLeft} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
