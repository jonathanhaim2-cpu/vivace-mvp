import Link from "next/link";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { getAccountRollup } from "@/lib/accounts";
import { monthLabel, previousMonthKey, recentMonthKeys } from "@/lib/months";
import { cn } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : previousMonthKey();
  const rollup = await getAccountRollup(month);

  return (
    <div className="space-y-6">
      <PageHeader
        title="דוח תחילת חודש"
        description={`סיכום ${monthLabel(month)} לפי קטגוריות — מחשבוניות וקליטות ששובצו. לא כולל תעודות משלוח.`}
      />

      <FilterBar submitLabel="רענון">
        <CompactField label="חודש" htmlFor="report-month">
          <NativeSelect id="report-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>
      <ReportExportButtons report="monthly" month={month} />

      <Alert>
        <AlertTitle>TODO · ייבוא מכירות מ-Tabit</AlertTitle>
        <AlertDescription>
          דוח זה מסכם הוצאות/הכנסות ששובצו ידנית. חיבור מכירות Tabit לחישוב Food Cost בפועל מול תיאורטי — בשלב הבא.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Link href={`/invoices/package?month=${month}`} className={cn(buttonVariants())}>
          חבילת הנה״ח לחודש זה
        </Link>
        <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
          סיווג חשבוניות
        </Link>
        <Link href="/waste" className={cn(buttonVariants({ variant: "outline" }))}>
          דוח פחת
        </Link>
        <Link href="/ap" className={cn(buttonVariants({ variant: "ghost" }))}>
          תשלומים
        </Link>
      </div>

      <AccountRollup rows={rollup} />
    </div>
  );
}
