import { AccountRollup } from "@/components/accounts/account-rollup";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
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

      <FilterBar submitLabel="הצגת חודש">
        <CompactField label="חודש" htmlFor="pkg-month">
          <NativeSelect id="pkg-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>

      <CompactPanel
        title={`${classifiedDocs} מסמכים משובצים`}
        description="רק קטגוריות. סיכומי האב מופיעים בגוף המייל ובקובץ הסיכום שב-ZIP."
      >
        <div className="flex flex-wrap gap-2">
          <a href={`/api/accountant/package?month=${month}`} className={cn(buttonVariants({ size: "sm" }))}>
            הורדת ZIP
          </a>
          <a href={mailto} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            טיוטת מייל להנה״ח
          </a>
        </div>
      </CompactPanel>

      <CompactPanel title="נושא וגוף המייל">
        <p className="text-sm font-medium">{subject}</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{body}</pre>
      </CompactPanel>

      <AccountRollup rows={rollup} />
    </div>
  );
}
