import { PageHeader } from "@/components/page-header";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
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
  const { days, total } = await getCashflow(month);

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
      <p className="text-sm font-medium">סה״כ לחודש {formatIls(total)}</p>
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
