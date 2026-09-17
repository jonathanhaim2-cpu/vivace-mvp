import Link from "next/link";
import { uploadStandaloneInvoice } from "@/actions/invoices";
import { AccountPicker } from "@/components/accounts/account-picker";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { InvoiceAiTip } from "@/components/ai-helper-tip";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { ClassifiedInvoiceTable } from "@/components/invoices/classified-invoice-table";
import { DuplicateInvoiceCard } from "@/components/invoices/duplicate-invoice-card";
import { ImportSuccessBanner } from "@/components/invoices/import-success-banner";
import { InvoiceFilterBar } from "@/components/invoices/invoice-filter-bar";
import { PendingInvoiceCard } from "@/components/invoices/pending-invoice-card";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccountRollup } from "@/lib/accounts";
import { getAiRuntime } from "@/lib/ai";
import { scanExistingInvoiceDuplicates } from "@/lib/invoice-duplicates";
import {
  matchesClassifiedFilters,
  matchesPendingFilters,
  parseInvoiceFilters,
  photoPeriodMonth,
  photoSupplierName,
  uniquePeriodMonths,
  uniqueSupplierNames,
  type InvoiceFilterPhoto,
} from "@/lib/invoice-filters";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { publicFileUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function importedCountFromParam(imported: string | undefined) {
  if (!imported || !/^\d+$/.test(imported)) return 0;
  return Number(imported);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    dup?: string;
    month?: string;
    from?: string;
    to?: string;
    category?: string;
    supplier?: string;
    status?: string;
    q?: string;
  }>;
}) {
  await scanExistingInvoiceDuplicates();
  const params = await searchParams;
  const importedCount = importedCountFromParam(params.imported);
  const duplicateNotice = Number.parseInt(params.dup ?? "", 10);
  const filters = parseInvoiceFilters(params);

  const [photos, rollup, runtime] = await Promise.all([
    prisma.invoicePhoto.findMany({
      include: {
        account: { include: { parent: true } },
        goodsReceipt: { include: { order: { include: { supplier: true } } } },
        duplicateOf: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getAccountRollup(),
    getAiRuntime(),
  ]);

  const duplicates = photos.filter((photo) => photo.isDuplicate);
  const uniquePhotos = photos.filter((photo) => !photo.isDuplicate);
  const filterPhotos: InvoiceFilterPhoto[] = uniquePhotos.map((photo) => ({
    accountId: photo.accountId,
    originalName: photo.originalName,
    fileName: photo.fileName,
    periodMonth: photo.periodMonth,
    createdAt: photo.createdAt,
    amountIls: photo.amountIls,
    aiTotalIls: photo.aiTotalIls,
    aiInvoiceDate: photo.aiInvoiceDate,
    aiSupplierName: photo.aiSupplierName,
    supplierName: photo.goodsReceipt?.order.supplier.name ?? null,
  }));

  const counts = Object.fromEntries(rollup.flatMap((parent) => parent.children.map((child) => [child.id, child.documents])));
  const pending = uniquePhotos.filter((_, index) => matchesPendingFilters(filterPhotos[index], filters));
  const classified = uniquePhotos.filter((_, index) => matchesClassifiedFilters(filterPhotos[index], filters));
  const classifiedTotal = uniquePhotos.filter((photo) => photo.accountId).length;
  const months = uniquePeriodMonths(filterPhotos, recentMonthKeys());
  const suppliers = uniqueSupplierNames(filterPhotos);
  const monthOptions = recentMonthKeys();
  const monthSummary = filters.month === "all" ? "כל החודשים" : monthLabel(filters.month);
  const rollupDocuments = uniquePhotos.flatMap((photo) =>
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
    <div className="space-y-8">
      <PageHeader
        title="חשבוניות וסיווג"
        description="שיבוץ לקטגוריה בתבנית הנה״ח של יונתן. האב נמדד בדוח ובחבילת רואה החשבון."
      />

      {importedCount > 0 ? <ImportSuccessBanner count={importedCount} /> : null}
      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}
      <InvoiceAiTip />

      {Number.isFinite(duplicateNotice) && duplicateNotice > 0 ? (
        <Alert>
          <AlertTitle>כפילות — לא יובא שוב</AlertTitle>
          <AlertDescription>
            {duplicateNotice === 1
              ? "הקובץ כבר קיים במערכת. הוא נשמר ב«כפילויות» ולא נספר בסיכומי כרטיסים או בחבילת הנה״ח."
              : `${duplicateNotice} קבצים כבר קיימים. הם נשמרו ב«כפילויות» ולא נספרים בסיכומים.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/invoices/import" className={cn(buttonVariants({ variant: "outline" }))}>
          ייבוא מתיקייה
        </Link>
        <Link href="/invoices/mail" className={cn(buttonVariants({ variant: "outline" }))}>
          חיבור מייל
        </Link>
        <Link href="/invoices/package" className={cn(buttonVariants())}>
          חבילה להנה״ח
        </Link>
        <Link href="/ap" className={cn(buttonVariants({ variant: "outline" }))}>
          תשלומים וכרטסת
        </Link>
        <Link href="/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
          דוח חודשי
        </Link>
        <Link href="/waste" className={cn(buttonVariants({ variant: "ghost" }))}>
          דוח פחת
        </Link>
        <Link href="/settings" className={cn(buttonVariants({ variant: "ghost" }))}>
          שימוש AI
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סינון מסמכים</CardTitle>
          <CardDescription>
            קודם בוחרים סינון (חודש, תאריך, קטגוריה, סטטוס, חיפוש) — ואז רואים רשימה קומפקטית. תמונה רק בלחיצה על «תצוגה».
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceFilterBar filters={filters} months={months} suppliers={suppliers} />
        </CardContent>
      </Card>

      {pending.length > 0 ? (
        <Card id="pending-classification" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>ממתינות לסיווג · {pending.length}</CardTitle>
            <CardDescription>
              ייבוא והעלאה בלי קטגוריה נכנסים לכאן. רואים את המסמך, מאשרים הצעת AI, או ממלאים תאריך/ספק/סכום ומשבצים ידנית.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.map((photo) => (
              <PendingInvoiceCard key={photo.id} photo={photo} months={monthOptions} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {duplicates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>כפילויות · {duplicates.length}</CardTitle>
            <CardDescription>
              חשודים כהעתק של מסמך שכבר יובא. לא נספרים בכרטיסים, בדוח החודשי או בחבילת רואה החשבון עד שתאשרו שהם ייחודיים.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicates.map((photo) => (
              <DuplicateInvoiceCard key={photo.id} photo={photo} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>מסמכים משובצים</CardTitle>
          <CardDescription>
            {classified.length} תוצאות · {monthSummary}
            {filters.from || filters.to ? ` · ${filters.from || "…"}–${filters.to || "…"}` : ""}
            {classifiedTotal > 0 ? ` · ${classifiedTotal} משובצים במערכת` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassifiedInvoiceTable
            rows={classified.map((photo) => ({
              id: photo.id,
              originalName: photo.originalName,
              fileName: photo.fileName,
              mimeType: photo.mimeType,
              createdAt: photo.createdAt,
              periodMonth: photoPeriodMonth({
                periodMonth: photo.periodMonth,
                createdAt: photo.createdAt,
                aiInvoiceDate: photo.aiInvoiceDate,
              }),
              accountId: photo.accountId as string,
              amountIls: photo.amountIls,
              aiTotalIls: photo.aiTotalIls,
              aiConfidence: photo.aiConfidence,
              aiStatus: photo.aiStatus,
              supplierName: photoSupplierName({
                supplierName: photo.goodsReceipt?.order.supplier.name ?? null,
                aiSupplierName: photo.aiSupplierName,
              }),
            }))}
            emptyTitle={classifiedTotal === 0 ? "אין חשבוניות משובצות" : "אין תוצאות לסינון"}
            emptyDescription={
              classifiedTotal === 0
                ? "העלו או ייבאו מסמך ושייכו לקטגוריה."
                : "שנו חודש, תאריך, קטגוריה או חיפוש — או אפסו לחודש הנוכחי."
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>העלאה + ניתוח</CardTitle>
          <CardDescription>
            אפשר לבחור קטגוריה מראש, או להעלות בלי שיבוץ ולקבל הצעת AI לאישור.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadStandaloneInvoice} className="space-y-5">
            <AccountPicker defaultValue="" counts={counts} allowEmpty />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="photo">צילום / קובץ</FieldLabel>
                <Input id="photo" name="photo" type="file" accept="image/*,application/pdf" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="periodMonth">חודש לדיווח</FieldLabel>
                <select
                  id="periodMonth"
                  name="periodMonth"
                  defaultValue={monthKeyFromDate()}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  {monthOptions.map((key) => (
                    <option key={key} value={key}>
                      {monthLabel(key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="amountIls">סכום ללא מע״מ</FieldLabel>
                <Input id="amountIls" name="amountIls" type="number" min={0} step="0.01" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="voiceNoteText">תמליל הערת קול (זמני)</FieldLabel>
                <Textarea id="voiceNoteText" name="voiceNoteText" placeholder="למשל: ירקות השרון אוגוסט" />
                <FieldDescription>במקום הקלטה אמיתית.</FieldDescription>
              </Field>
            </div>
            <Button type="submit">העלאה וניתוח</Button>
          </form>
        </CardContent>
      </Card>

      <AccountRollup rows={rollup} documents={rollupDocuments} />
    </div>
  );
}
