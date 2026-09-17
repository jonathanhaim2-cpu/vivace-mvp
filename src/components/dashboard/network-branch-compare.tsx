import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BranchComparisonRow } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { cn } from "@/lib/utils";

const BRANCH_COLORS = ["var(--brand-red)", "#3d6b6a"] as const;

/** Width of a value as % of the pair's max. Zero stays an empty muted track. */
function pairBarPercent(value: number, max: number) {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.min(100, (value / max) * 100);
}

function PairTrack({ value, max, color }: { value: number; max: number; color: string }) {
  const percent = pairBarPercent(value, max);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      {percent > 0 ? (
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      ) : null}
    </div>
  );
}

function PairBars({ left, right }: { left: number; right: number }) {
  const max = Math.max(0, left, right);
  return (
    <div className="grid grid-cols-2 gap-1.5" dir="ltr">
      <PairTrack value={left} max={max} color={BRANCH_COLORS[0]} />
      <PairTrack value={right} max={max} color={BRANCH_COLORS[1]} />
    </div>
  );
}

function formatPercent(value: number | null) {
  return value != null ? `${value.toFixed(1)}%` : "—";
}

function CompareRow({
  label,
  left,
  right,
  format = (value: number) => value.toFixed(1),
  suffix = "",
}: {
  label: string;
  left: number;
  right: number;
  format?: (value: number) => string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-xs leading-tight">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 tabular-nums" dir="ltr">
          <span style={{ color: BRANCH_COLORS[0] }}>
            {format(left)}
            {suffix}
          </span>
          <span className="text-muted-foreground"> · </span>
          <span style={{ color: BRANCH_COLORS[1] }}>
            {format(right)}
            {suffix}
          </span>
        </span>
      </div>
      <PairBars left={left} right={right} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium leading-tight tabular-nums" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function BranchStatCard({
  branch,
  color,
}: {
  branch: BranchComparisonRow;
  color: string;
}) {
  return (
    <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <p className="truncate text-sm font-medium">{branch.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Metric label="רכש" value={formatIls(branch.purchaseTotal)} />
        <Metric label="% מחזור" value={formatPercent(branch.purchasePercent)} />
        <Metric label="חשבוניות" value={`${branch.invoiceCount} · ${formatIls(branch.invoiceTotal)}`} />
        <Metric label="הזמנות" value={`${branch.orderCount} · ${formatIls(branch.orderVolume)}`} />
      </div>
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-border/70 pb-1 text-[10px] text-muted-foreground">
          <span>קטגוריה</span>
          <span>בפועל / יעד</span>
        </div>
        <ul className="m-0 list-none p-0">
          {branch.fill.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border/40 py-1 text-[11px] leading-tight last:border-b-0"
            >
              <span className="truncate" title={row.name}>
                {row.name}
              </span>
              <span className="shrink-0 tabular-nums" dir="ltr">
                <span className={cn(row.over ? "font-medium text-destructive" : "text-foreground")}>
                  {formatPercent(row.actualPercent)}
                </span>
                {row.targetPercent != null ? (
                  <span className="text-muted-foreground">{` / ${row.targetPercent}%`}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function NetworkBranchCompare({
  branches,
  forecast,
  unattributedInvoices,
}: {
  branches: BranchComparisonRow[];
  forecast: number;
  unattributedInvoices: number;
}) {
  if (branches.length === 0) return null;
  const left = branches[0];
  const right = branches[1] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>השוואת סניפים</CardTitle>
        <CardDescription>רכש לפי סניף מול מחזור חזוי {formatIls(forecast)}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("grid gap-3", branches.length > 1 ? "md:grid-cols-2" : "grid-cols-1")}>
          {branches.map((branch, index) => (
            <BranchStatCard key={branch.id} branch={branch} color={BRANCH_COLORS[index % BRANCH_COLORS.length]} />
          ))}
        </div>
        {right ? (
          <div className="space-y-2.5 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium">השוואה יחסית</p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: BRANCH_COLORS[0] }} />
                  {left.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: BRANCH_COLORS[1] }} />
                  {right.name}
                </span>
              </div>
            </div>
            <CompareRow
              label="רכש (₪)"
              left={left.purchaseTotal}
              right={right.purchaseTotal}
              format={(value) => formatIls(value)}
            />
            <CompareRow
              label="% מהמחזור"
              left={left.purchasePercent ?? 0}
              right={right.purchasePercent ?? 0}
              suffix="%"
            />
            <CompareRow
              label="חשבוניות (₪)"
              left={left.invoiceTotal}
              right={right.invoiceTotal}
              format={(value) => formatIls(value)}
            />
            <CompareRow
              label="היקף הזמנות"
              left={left.orderVolume}
              right={right.orderVolume}
              format={(value) => formatIls(value)}
            />
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-muted-foreground">לפי קטגוריה</p>
              {left.fill.map((row) => {
                const other = right.fill.find((item) => item.id === row.id);
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-[11px] leading-tight">
                      <span className="truncate" title={row.name}>
                        {row.name}
                      </span>
                      <span className="shrink-0 tabular-nums" dir="ltr">
                        <span style={{ color: BRANCH_COLORS[0] }}>{formatPercent(row.actualPercent)}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span style={{ color: BRANCH_COLORS[1] }}>{formatPercent(other?.actualPercent ?? null)}</span>
                      </span>
                    </div>
                    <PairBars left={row.actualPercent ?? 0} right={other?.actualPercent ?? 0} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {unattributedInvoices > 0 ? (
          <p className="text-xs text-muted-foreground">
            {unattributedInvoices} הוצאות רשתיות — לא נספרות באחוז רכש של סניף, כן בחבילת הנה״ח ובסיכום הרשת.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
