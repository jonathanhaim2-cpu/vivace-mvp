import Link from "next/link";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { ReportsNav } from "@/components/reports/reports-nav";
import { PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { getAccountRollup } from "@/lib/accounts";
import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { monthLabel, monthRangeUtc, previousMonthKey, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { publicFileUrl } from "@/lib/uploads";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : previousMonthKey();
  const range = monthRangeUtc(month);
  const [rollup, photos] = await Promise.all([
    getAccountRollup(month),
    prisma.invoicePhoto.findMany({
      where: {
        ...INVOICE_IN_TOTALS_WHERE,
        accountId: { not: null },
        OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: range.start, lt: range.end } }],
      },
      include: { goodsReceipt: { include: { order: { include: { supplier: true } } } } },
    }),
  ]);
  const documents = photos.flatMap((photo) =>
    photo.accountId
      ? [
          {
            id: photo.id,
            accountId: photo.accountId,
            originalName: photo.originalName,
            fileUrl: publicFileUrl(photo.fileName),
            mimeType: photo.mimeType,
            createdAt: photo.createdAt.toISOString(),
            invoiceDate: photo.aiInvoiceDate,
            supplierName: photo.aiSupplierName ?? photo.goodsReceipt?.order.supplier.name ?? null,
            amountIls: photo.amountIls ?? photo.aiTotalIls,
          },
        ]
      : [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="דוחות"
        description={`כל הדוחות במקום אחד. רווח והפסד ל־${monthLabel(month)} — אותם סכומים, תצוגה קומפקטית.`}
      />
      <ReportsNav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["/reports/food-cost", "עלות רכש", "ספק ← חשבוניות"],
          ["/reports/trends", "מגמות מחיר", "חודשים ושנים"],
          ["/reports/drill", "פירוק סכום", "קטגוריה ← ספק ← מסמך"],
          ["/reports/cashflow", "תזרים", "יתרה צפויה"],
          ["/reports/ap", "תשלום לספק", "כרטסת וחיוב"],
          ["/anomalies", "חריגות", "מחיר, חוסר, סורר"],
          ["/waste", "פחת", "דיווח לפי סניף"],
          ["/invoices/package", "חבילת הנה״ח", "ייצוא לחודש"],
          ["/settlements", "התחשבנות סניפים", "העברות ותמלוגים"],
          ["/office/quotes", "הצעת מחיר", "משרד רשת"],
        ].map(([href, label, hint]) => (
          <Link key={href} href={href} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </Link>
        ))}
      </div>

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

      <AccountRollup rows={rollup} documents={documents} />
    </div>
  );
}
