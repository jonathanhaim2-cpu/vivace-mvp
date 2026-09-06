import { AccountRollup } from "@/components/accounts/account-rollup";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accountantMailto, accountantPackageText } from "@/lib/accountant-package";
import { getAccountRollup } from "@/lib/accounts";
import { monthLabel, previousMonthKey, recentMonthKeys } from "@/lib/months";
import { cn } from "@/lib/utils";

export default async function AccountantPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : previousMonthKey();
  const rollup = await getAccountRollup(month);
  const { subject, body } = accountantPackageText(month, rollup);
  const mailto = accountantMailto(month, rollup);
  const classifiedDocs = rollup.reduce((sum, row) => sum + row.documents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="חבילה לרואה החשבון"
        description={`איסוף כל החשבוניות המשובצות לחודש ${monthLabel(month)} · ZIP + טיוטת מייל בעברית.`}
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
          הצגת חודש
        </button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{classifiedDocs} מסמכים משובצים</CardTitle>
          <CardDescription>רק כרטיסי בן. סיכומי האב מופיעים בגוף המייל ובקובץ הסיכום שב-ZIP.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <a href={`/api/accountant/package?month=${month}`} className={cn(buttonVariants())}>
            הורדת ZIP
          </a>
          <a href={mailto} className={cn(buttonVariants({ variant: "outline" }))}>
            טיוטת מייל להנה״ח
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>נושא וגוף המייל</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{subject}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{body}</pre>
        </CardContent>
      </Card>

      <AccountRollup rows={rollup} />
    </div>
  );
}
