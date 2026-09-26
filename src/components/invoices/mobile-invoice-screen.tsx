import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { InvoiceFilterSheet } from "@/components/invoices/invoice-filter-sheet";
import { InvoiceOverflowMenu } from "@/components/invoices/invoice-overflow-menu";
import { InvoiceStatusPill } from "@/components/invoices/invoice-status-pill";
import { InvoiceUploadSheet } from "@/components/invoices/invoice-upload-sheet";
import type { BranchOption } from "@/components/branches/branch-select";
import {
  activeInvoiceSheetFilterCount,
  invoicesFilterQuery,
  type InvoiceListFilters,
} from "@/lib/invoice-filters";
import type { InvoiceListStatus } from "@/lib/invoice-list-status";
import { monthKeyFromDate, previousMonthKey } from "@/lib/months";
import { cn } from "@/lib/utils";

export type MobileInvoiceRow = {
  id: string;
  supplier: string;
  meta: string;
  amount: string;
  status: InvoiceListStatus;
  group: string;
};

function withQueue(href: string, queue: boolean) {
  if (!queue) return href;
  return href.includes("?") ? `${href}&queue=1` : `${href}?queue=1`;
}

export function MobileInvoiceScreen({
  filters,
  queue,
  totalCount,
  summary,
  queueCount,
  rows,
  suppliers,
  branches,
  upload,
  returnTo,
}: {
  filters: InvoiceListFilters;
  queue: boolean;
  totalCount: number;
  summary: string;
  queueCount: number;
  rows: MobileInvoiceRow[];
  suppliers: string[];
  branches: BranchOption[];
  upload: ReactNode;
  returnTo: string;
}) {
  const periods = [
    { label: "החודש", month: monthKeyFromDate() },
    { label: "חודש קודם", month: previousMonthKey() },
    { label: "הכל", month: "all" },
  ];
  const activeCount = activeInvoiceSheetFilterCount(filters);
  const queueHref = withQueue(invoicesFilterQuery({ ...filters, status: "all" }), true);
  const groups: { label: string; rows: MobileInvoiceRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (!last || last.label !== row.group) groups.push({ label: row.group, rows: [row] });
    else last.rows.push(row);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">חשבוניות</h1>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
          {totalCount}
        </span>
        <div className="flex-1" />
        <InvoiceUploadSheet>{upload}</InvoiceUploadSheet>
        <InvoiceOverflowMenu />
      </div>

      <div className="flex items-center gap-2">
        <form action="/invoices" method="get" className="relative min-w-0 flex-1">
          <input type="hidden" name="month" value={filters.month} />
          {filters.status !== "all" ? <input type="hidden" name="status" value={filters.status} /> : null}
          {filters.from ? <input type="hidden" name="from" value={filters.from} /> : null}
          {filters.to ? <input type="hidden" name="to" value={filters.to} /> : null}
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          {filters.supplier ? <input type="hidden" name="supplier" value={filters.supplier} /> : null}
          {filters.branch ? <input type="hidden" name="branch" value={filters.branch} /> : null}
          {filters.documentType !== "all" ? <input type="hidden" name="documentType" value={filters.documentType} /> : null}
          {queue ? <input type="hidden" name="queue" value="1" /> : null}
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="חיפוש ספק, מספר או סכום"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-border bg-card ps-9 pe-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </form>
        <InvoiceFilterSheet
          filters={filters}
          suppliers={suppliers}
          branches={branches}
          resultCount={rows.length}
          activeCount={activeCount}
        />
      </div>

      <div className="flex gap-2">
        {periods.map((period) => {
          const active = filters.month === period.month;
          return (
            <Link
              key={period.month}
              href={withQueue(invoicesFilterQuery({ ...filters, month: period.month }), queue)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                active ? "bg-primary font-medium text-primary-foreground" : "bg-card text-muted-foreground",
              )}
            >
              {period.label}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{summary}</p>

      {queueCount > 0 ? (
        <Link
          href={queueHref}
          className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="truncate">{queueCount} ממתינות לאישור / סיווג</span>
          </span>
          <span className="shrink-0 font-medium">לטיפול</span>
        </Link>
      ) : null}

      {groups.length === 0 ? (
        <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">אין מסמכים לסינון הזה.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-2">
            <h2 className="px-1 text-sm font-bold">{group.label}</h2>
            <ul className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
              {group.rows.map((row) => (
                <li key={row.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/invoices/${row.id}?return=${encodeURIComponent(returnTo)}`}
                    className="flex min-h-[60px] items-center gap-3 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{row.supplier}</span>
                      <span className="block truncate text-xs text-muted-foreground">{row.meta}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-start gap-1">
                      <span className="text-sm font-bold tabular-nums">{row.amount}</span>
                      <InvoiceStatusPill status={row.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
