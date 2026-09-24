import { saveOpeningBalance } from "@/actions/payments";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { formatIls } from "@/lib/format";
import { getCashflow } from "@/lib/cashflow";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const { days, total, openingBalance, projection } = await getCashflow(month);
  const width = 640;
  const height = 160;
  const balances = projection.map((point) => point.balance);
  const min = Math.min(openingBalance, ...balances, 0);
  const max = Math.max(openingBalance, ...balances, 1);
  const span = max - min || 1;
  const chart = [
    `0,${height - ((openingBalance - min) / span) * (height - 12) - 6}`,
    ...projection.map((point, index) => {
      const x = projection.length <= 1 ? width : ((index + 1) / projection.length) * width;
      const y = height - ((point.balance - min) / span) * (height - 12) - 6;
      return `${x},${y}`;
    }),
  ].join(" ");

  return (
    <div className="space-y-4">
      <PageHeader
        title="תזרים מזומנים"
        description={`כמה ומתי צריך בחשבון ב־${monthLabel(month)}. מתעדכן עם רכש והוצאות קבועות.`}
      />
      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="cf-month">
          <NativeSelect id="cf-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>
      <form action={saveOpeningBalance} className="flex flex-wrap items-end gap-2">
        <CompactField label="יתרת פתיחה" htmlFor="opening">
          <Input id="opening" name="openingBalance" type="number" step="0.01" defaultValue={openingBalance} />
        </CompactField>
        <Button type="submit" size="sm" variant="outline">
          שמירת יתרה
        </Button>
      </form>
      <p className="text-sm font-medium">סה״כ יציאות לחודש {formatIls(total)}</p>
      {projection.length > 0 ? (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">יתרה צפויה לאורך החודש</p>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="יתרה צפויה">
            <polyline fill="none" stroke="#3f6b4e" strokeWidth="3" points={chart} />
          </svg>
          <p className="mt-2 text-sm tabular-nums">
            יתרה בסוף החודש {formatIls(projection[projection.length - 1]?.balance ?? openingBalance)}
          </p>
        </div>
      ) : null}
      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין חיובים מתוזמנים.</p>
      ) : (
        <ol className="space-y-3">
          {days.map((bucket) => (
            <li key={bucket.day} className="rounded-xl border p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="font-medium">יום {bucket.day}</p>
                <p className="tabular-nums">{formatIls(bucket.amountIls)}</p>
              </div>
              <ul className="space-y-1 text-sm">
                {bucket.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>
                      {item.name}
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.paymentLabel}
                        {item.kind === "fixed" ? " · קבוע" : item.kind === "supplier" ? " · ספק" : ""}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatIls(item.amountIls)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
