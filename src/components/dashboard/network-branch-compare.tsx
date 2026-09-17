import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BranchComparisonRow } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { barsScaledToMax } from "@/lib/purchase-fill";
import { cn } from "@/lib/utils";

const BRANCH_COLORS = ["var(--brand-red)", "#3d6b6a"] as const;
const TABLE_COLS = "grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3";

function branchColor(index: number) {
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

function formatPct(value: number | null | undefined) {
  return value != null && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}

function BranchStatCard({
  branch,
  color,
}: {
  branch: BranchComparisonRow;
  color: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <p className="truncate text-sm font-medium">{branch.name}</p>
      </div>
      <div className={cn(TABLE_COLS, "gap-y-0.5 text-[13px] leading-6")}>
        <span className="text-muted-foreground">רכש</span>
        <span className="whitespace-nowrap text-end tabular-nums" dir="ltr">
          {formatIls(branch.purchaseTotal)}
        </span>
        <span className="whitespace-nowrap text-end tabular-nums text-muted-foreground" dir="ltr">
          {branch.purchasePercent != null ? `${formatPct(branch.purchasePercent)} מחזור` : "—"}
        </span>
        <span className="text-muted-foreground">חשבוניות</span>
        <span className="whitespace-nowrap text-end tabular-nums" dir="ltr">
          {branch.invoiceCount}
        </span>
        <span className="whitespace-nowrap text-end tabular-nums text-muted-foreground" dir="ltr">
          {formatIls(branch.invoiceTotal)}
        </span>
        <span className="text-muted-foreground">הזמנות</span>
        <span className="whitespace-nowrap text-end tabular-nums" dir="ltr">
          {branch.orderCount}
        </span>
        <span className="whitespace-nowrap text-end tabular-nums text-muted-foreground" dir="ltr">
          {formatIls(branch.orderVolume)}
        </span>
      </div>
      <div className="mt-3 border-t border-border/80 pt-2">
        <div className={cn(TABLE_COLS, "gap-y-1 text-[12px] leading-5")}>
          <span className="text-[11px] text-muted-foreground">קטגוריה</span>
          <span className="whitespace-nowrap text-end text-[11px] text-muted-foreground">בפועל / יעד</span>
          <span className="whitespace-nowrap text-end text-[11px] text-muted-foreground">סכום</span>
          {branch.fill.map((row) => (
            <div key={row.id} className="contents">
              <span
                className={cn("min-w-0 truncate", row.over && "font-medium text-destructive")}
                title={row.name}
              >
                {row.name}
              </span>
              <span
                className={cn("whitespace-nowrap text-end tabular-nums", row.over && "font-medium text-destructive")}
                dir="ltr"
              >
                {formatPct(row.actualPercent)}
                {row.targetPercent != null ? ` / ${row.targetPercent}%` : ""}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-end tabular-nums",
                  row.over ? "font-medium text-destructive" : "text-muted-foreground",
                )}
                dir="ltr"
              >
                {formatIls(row.spent)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareBarRow({
  name,
  color,
  value,
  percent,
}: {
  name: string;
  color: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,8rem)_minmax(0,1fr)_auto] items-center gap-2 text-[12px]">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate" title={name}>
          {name}
        </span>
      </span>
      <div className="h-2 min-w-0 overflow-hidden rounded-full bg-muted" dir="ltr">
        {percent > 0 ? (
          <div
            className="h-full max-w-full rounded-full"
            style={{ width: `${percent}%`, minWidth: 2, background: color }}
          />
        ) : null}
      </div>
      <span className="tabular-nums text-muted-foreground" dir="ltr">
        {value}
      </span>
    </div>
  );
}

function CompareMetric({
  label,
  branches,
  values,
  format,
}: {
  label: string;
  branches: BranchComparisonRow[];
  values: number[];
  format: (value: number) => string;
}) {
  const percents = barsScaledToMax(values);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      {branches.map((branch, index) => (
        <CompareBarRow
          key={branch.id}
          name={branch.name}
          color={branchColor(index)}
          value={format(values[index] ?? 0)}
          percent={percents[index] ?? 0}
        />
      ))}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>השוואת סניפים</CardTitle>
        <CardDescription>
          לכל סניף: רכש וחשבוניות החודש מול המחזור החזוי ({formatIls(forecast)}), ואחוז כל קטגוריה מול היעד —
          כולל חשבוניות ששובצו לסניף גם בלי הזמנה במערכת.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("grid gap-3", branches.length > 1 ? "md:grid-cols-2" : "grid-cols-1")}>
          {branches.map((branch, index) => (
            <BranchStatCard key={branch.id} branch={branch} color={branchColor(index)} />
          ))}
        </div>
        {branches.length > 1 ? (
          <div className="space-y-4 rounded-lg border bg-card p-3">
            <div>
              <p className="text-xs font-medium">השוואה יחסית</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                אורך העמודה לפי הסניף הגבוה בכל שורה — אפס נשאר מסלול ריק, לא פס מלא.
              </p>
            </div>
            <CompareMetric
              label="רכש (₪)"
              branches={branches}
              values={branches.map((branch) => branch.purchaseTotal)}
              format={formatIls}
            />
            <CompareMetric
              label="% מהמחזור"
              branches={branches}
              values={branches.map((branch) => branch.purchasePercent ?? 0)}
              format={(value) => formatPct(value)}
            />
            <CompareMetric
              label="חשבוניות (₪)"
              branches={branches}
              values={branches.map((branch) => branch.invoiceTotal)}
              format={formatIls}
            />
            <CompareMetric
              label="היקף הזמנות"
              branches={branches}
              values={branches.map((branch) => branch.orderVolume)}
              format={formatIls}
            />
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
