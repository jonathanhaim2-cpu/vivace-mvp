import Link from "next/link";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
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
        description={`סיכום ${monthLabel(month)} לפי קטגוריות אב וכרטיסי בן — מחשבוניות וקליטות ששובצו.`}
      />

      <form className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">חודש</span>
          <select
            name="month"
            defaultValue={month}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          רענון
        </button>
      </form>

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
      </div>

      <AccountRollup rows={rollup} />
    </div>
  );
}
