import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BranchComparisonRow, CategoryFill } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { relativeShare } from "@/lib/purchase-fill";
import { cn } from "@/lib/utils";

const BRANCH_COLORS = ["var(--brand-red)", "#3d6b6a"] as const;

function categoryMax(fillA: CategoryFill[], fillB: CategoryFill[]) {
  return Math.max(1, ...fillA.map((row) => row.actualPercent ?? 0), ...fillB.map((row) => row.actualPercent ?? 0));
}

function CompareBar({
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
  const share = relativeShare(left, right);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span style={{ color: BRANCH_COLORS[0] }}>{format(left)}{suffix}</span>
          {" · "}
          <span style={{ color: BRANCH_COLORS[1] }}>{format(right)}{suffix}</span>
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" dir="ltr">
        <div className="h-full" style={{ width: `${share.left}%`, background: BRANCH_COLORS[0] }} />
        <div className="h-full" style={{ width: `${share.right}%`, background: BRANCH_COLORS[1] }} />
      </div>
    </div>
  );
}

function CategoryCompareChart({ left, right }: { left: BranchComparisonRow; right: BranchComparisonRow }) {
  const max = categoryMax(left.fill, right.fill);
  const height = Math.max(120, left.fill.length * 28);
  const rowH = height / Math.max(1, left.fill.length);
  const padL = 78;
  const padR = 8;
  const width = 360;
  const plotW = width - padL - padR;
  const barH = 7;

  return (
    <div dir="ltr">
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="השוואת אחוז רכש לפי קטגוריה"
    >
      {left.fill.map((row, index) => {
        const other = right.fill.find((item) => item.id === row.id);
        const y = index * rowH + rowH / 2;
        const leftW = ((row.actualPercent ?? 0) / max) * plotW;
        const rightW = ((other?.actualPercent ?? 0) / max) * plotW;
        return (
          <g key={row.id}>
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">
              {row.name}
            </text>
            <rect x={padL} y={y - barH - 1} width={Math.max(1, leftW)} height={barH} rx="2" fill={BRANCH_COLORS[0]} />
            <rect x={padL} y={y + 1} width={Math.max(1, rightW)} height={barH} rx="2" fill={BRANCH_COLORS[1]} />
          </g>
        );
      })}
    </svg>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-sm tabular-nums" dir="ltr">
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
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        <p className="text-sm font-medium">{branch.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Metric label="רכש" value={formatIls(branch.purchaseTotal)} />
        <Metric
          label="% מחזור"
          value={branch.purchasePercent != null ? `${branch.purchasePercent.toFixed(1)}%` : "—"}
        />
        <Metric label="חשבוניות" value={`${branch.invoiceCount} · ${formatIls(branch.invoiceTotal)}`} />
        <Metric label="הזמנות" value={`${branch.orderCount} · ${formatIls(branch.orderVolume)}`} />
      </div>
      <div className="space-y-1">
        {branch.fill.map((row) => {
          const fillPct =
            row.targetPercent && row.targetPercent > 0 && row.actualPercent != null
              ? Math.min(140, (row.actualPercent / row.targetPercent) * 100)
              : row.actualPercent
                ? Math.min(100, row.actualPercent)
                : 0;
          return (
            <div key={row.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span>{row.name}</span>
                <span
                  className={cn("tabular-nums", row.over ? "font-medium text-destructive" : "text-muted-foreground")}
                  dir="ltr"
                >
                  {row.actualPercent != null ? `${row.actualPercent.toFixed(1)}%` : "—"}
                  {row.targetPercent != null ? ` / ${row.targetPercent}%` : ""}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", row.over ? "bg-destructive" : "")}
                  style={{ width: `${Math.max(2, fillPct)}%`, background: row.over ? undefined : color }}
                />
              </div>
            </div>
          );
        })}
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
        <CardDescription>
          רכש מול מחזור חזוי {formatIls(forecast)} — כולל חשבוניות ששובצו לסניף גם בלי הזמנה במערכת.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("grid gap-3", branches.length > 1 ? "md:grid-cols-2" : "grid-cols-1")}>
          {branches.map((branch, index) => (
            <BranchStatCard key={branch.id} branch={branch} color={BRANCH_COLORS[index % BRANCH_COLORS.length]} />
          ))}
        </div>
        {right ? (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <p className="text-xs font-medium">השוואה יחסית</p>
            <CompareBar label="רכש (₪)" left={left.purchaseTotal} right={right.purchaseTotal} format={(v) => formatIls(v)} />
            <CompareBar
              label="% מהמחזור"
              left={left.purchasePercent ?? 0}
              right={right.purchasePercent ?? 0}
              suffix="%"
            />
            <CompareBar label="חשבוניות (₪)" left={left.invoiceTotal} right={right.invoiceTotal} format={(v) => formatIls(v)} />
            <CompareBar label="היקף הזמנות" left={left.orderVolume} right={right.orderVolume} format={(v) => formatIls(v)} />
            <CategoryCompareChart left={left} right={right} />
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
