import { markInvoicesSentToAccountant } from "@/actions/accountant-export";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { accountantMailto, accountantPackageText } from "@/lib/accountant-package";
import { accountantWhatsAppHref, getAccountantExportConfig } from "@/lib/accountant-export";
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
  const [rollup, config] = await Promise.all([getAccountRollup(month), getAccountantExportConfig()]);
  const { subject, body } = accountantPackageText(month, rollup);
  const mailto = accountantMailto(month, rollup, config.email);
  const classifiedDocs = rollup.reduce((sum, row) => sum + row.documents, 0);
  const waHref = config.whatsappReady ? accountantWhatsAppHref(config.whatsappPhone, monthLabel(month)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="חבילה לרואה החשבון"
        description={`חשבוניות, זיכויים וקבלות ל־${monthLabel(month)} — בלי תעודות משלוח ובלי גילול/כרטסת.`}
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
        title={`${classifiedDocs} מסמכים לחבילה`}
        description="מסלול מועדף: וואטסאפ למספר ההנה״ח. אם אין Business API — נפתח wa.me ידני, ואז ZIP / מייל / תיקייה."
      >
        <div className="flex flex-wrap gap-2">
          {waHref ? (
            <a href={waHref} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>
              וואטסאפ להנה״ח
            </a>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
              אין מספר וואטסאפ — הגדירו בהגדרות
            </span>
          )}
          <a href={`/api/accountant/package?month=${month}`} className={cn(buttonVariants({ size: "sm", variant: waHref ? "outline" : "default" }))}>
            הורדת ZIP
          </a>
          <a href={mailto} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            טיוטת מייל
          </a>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {config.whatsappReady
            ? `וואטסאפ: ${config.whatsappPhone}. אין webhook של WhatsApp Business בסביבה זו — סטטוס «נקלט/שגיאה» ידני אחרי השליחה.`
            : "הגדירו מספר וואטסאפ להנה״ח בהגדרות. בינתיים ZIP או מייל."}
          {config.email ? ` · מייל: ${config.email}` : ""}
          {config.folderHint ? ` · תיקייה: ${config.folderHint}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={markInvoicesSentToAccountant.bind(null, month, "whatsapp")}>
            <Button type="submit" size="sm" variant="secondary">
              סימון נשלח · וואטסאפ
            </Button>
          </form>
          <form action={markInvoicesSentToAccountant.bind(null, month, "email")}>
            <Button type="submit" size="sm" variant="ghost">
              סימון נשלח · מייל
            </Button>
          </form>
          <form action={markInvoicesSentToAccountant.bind(null, month, "folder")}>
            <Button type="submit" size="sm" variant="ghost">
              סימון נשלח · תיקייה
            </Button>
          </form>
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
