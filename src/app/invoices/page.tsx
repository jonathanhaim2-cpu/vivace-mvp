import Link from "next/link";
import { uploadStandaloneInvoice, updateInvoiceCategory } from "@/actions/invoices";
import { AccountPicker } from "@/components/accounts/account-picker";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { InvoiceAiTip } from "@/components/ai-helper-tip";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { AiSuggestionCard } from "@/components/ai-suggestion-card";
import { DuplicateInvoiceCard } from "@/components/invoices/duplicate-invoice-card";
import { ImportSuccessBanner } from "@/components/invoices/import-success-banner";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import { PendingInvoiceCard } from "@/components/invoices/pending-invoice-card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccountRollup } from "@/lib/accounts";
import { getAiRuntime } from "@/lib/ai";
import { chartLeafMeta } from "@/lib/chart-of-accounts";
import { expenseCategoryLabel, formatDateTime, formatIls } from "@/lib/format";
import { scanExistingInvoiceDuplicates } from "@/lib/invoice-duplicates";
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
  searchParams: Promise<{ imported?: string; dup?: string }>;
}) {
  await scanExistingInvoiceDuplicates();
  const { imported, dup } = await searchParams;
  const importedCount = importedCountFromParam(imported);
  const duplicateNotice = Number.parseInt(dup ?? "", 10);

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

  const counts = Object.fromEntries(rollup.flatMap((parent) => parent.children.map((child) => [child.id, child.documents])));
  const duplicates = photos.filter((photo) => photo.isDuplicate);
  const pending = photos.filter((photo) => !photo.accountId && !photo.isDuplicate);
  const classified = photos.filter((photo) => photo.accountId && !photo.isDuplicate);
  const months = recentMonthKeys();
  const rollupDocuments = classified.flatMap((photo) =>
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
              <PendingInvoiceCard key={photo.id} photo={photo} months={months} />
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
                  {months.map((key) => (
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

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">מסמכים משובצים</h2>
        {classified.length === 0 ? (
          <EmptyState title="אין חשבוניות משובצות" description="העלו או ייבאו מסמך ושייכו לקטגוריה." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {classified.map((photo) => {
              const fileUrl = publicFileUrl(photo.fileName);
              return (
                <Card key={photo.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{photo.originalName}</CardTitle>
                    <CardDescription>
                      {formatDateTime(photo.createdAt)}
                      {photo.periodMonth ? ` · ${monthLabel(photo.periodMonth)}` : ""}
                      {photo.aiSupplierName ? ` · ${photo.aiSupplierName}` : ""}
                      {photo.aiInvoiceDate ? ` · ${photo.aiInvoiceDate}` : ""}
                      {photo.goodsReceipt ? ` · קליטה מול ${photo.goodsReceipt.order.supplier.name}` : ""}
                      {photo.amountIls != null ? ` · ${formatIls(photo.amountIls)}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InvoiceDocumentPreview
                      fileUrl={fileUrl}
                      mimeType={photo.mimeType}
                      originalName={photo.originalName}
                    />
                    <p className="text-sm font-medium">{expenseCategoryLabel(photo.accountId)}</p>
                    {photo.aiStatus === "CONFIRMED" ? (
                      <AiSuggestionCard
                        photoId={photo.id}
                        supplierName={photo.aiSupplierName}
                        invoiceDate={photo.aiInvoiceDate}
                        totalIls={photo.aiTotalIls}
                        confidence={photo.aiConfidence}
                        reason={photo.aiReason}
                        status={photo.aiStatus}
                        suggestedAccount={chartLeafMeta(photo.aiAccountId)}
                      />
                    ) : null}
                    <form action={updateInvoiceCategory.bind(null, photo.id)} className="flex items-center gap-2">
                      <GroupedAccountSelect defaultValue={photo.accountId} />
                      {photo.periodMonth ? <input type="hidden" name="periodMonth" value={photo.periodMonth} /> : null}
                      <Button type="submit" size="sm" variant="outline">
                        שינוי
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AccountRollup rows={rollup} documents={rollupDocuments} />
    </div>
  );
}
