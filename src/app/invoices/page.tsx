import Link from "next/link";
import { uploadStandaloneInvoice, updateInvoiceCategory } from "@/actions/invoices";
import { AccountPicker } from "@/components/accounts/account-picker";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { AiSuggestionCard } from "@/components/ai-suggestion-card";
import { AnalyzeInvoiceButton } from "@/components/analyze-invoice-button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccountRollup } from "@/lib/accounts";
import { getAiRuntime } from "@/lib/ai";
import { chartLeafMeta } from "@/lib/chart-of-accounts";
import { expenseCategoryLabel, formatDateTime, formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { publicFileUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [photos, rollup, runtime] = await Promise.all([
    prisma.invoicePhoto.findMany({
      include: {
        account: { include: { parent: true } },
        goodsReceipt: { include: { order: { include: { supplier: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAccountRollup(),
    getAiRuntime(),
  ]);

  const counts = Object.fromEntries(rollup.flatMap((parent) => parent.children.map((child) => [child.id, child.documents])));
  const pending = photos.filter((photo) => !photo.accountId);
  const classified = photos.filter((photo) => photo.accountId);
  const months = recentMonthKeys();

  return (
    <div className="space-y-8">
      <PageHeader
        title="חשבוניות וסיווג"
        description="שיבוץ לכרטיס בן בתבנית הנה״ח של יונתן. האב נמדד בדוח ובחבילת רואה החשבון."
      />

      {runtime.reason === "no_key" ? <AiMissingBanner /> : null}

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
        <Card>
          <CardHeader>
            <CardTitle>ממתינות לסיווג · {pending.length}</CardTitle>
            <CardDescription>
              ייבוא והעלאה בלי כרטיס נכנסים לכאן. אפשר לאשר הצעת AI בלחיצה אחת, או לשייך ידנית.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.map((photo) => {
              const suggested = chartLeafMeta(photo.aiAccountId);
              return (
                <div key={photo.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{photo.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(photo.createdAt)} · {photo.source === "BULK_IMPORT" ? "ייבוא תיקייה" : "העלאה"}
                        {photo.periodMonth ? ` · ${monthLabel(photo.periodMonth)}` : ""}
                      </p>
                    </div>
                    {photo.aiStatus !== "SUGGESTED" && photo.aiStatus !== "CONFIRMED" ? (
                      <AnalyzeInvoiceButton photoId={photo.id} />
                    ) : null}
                  </div>
                  <AiSuggestionCard
                    photoId={photo.id}
                    supplierName={photo.aiSupplierName}
                    invoiceDate={photo.aiInvoiceDate}
                    totalIls={photo.aiTotalIls}
                    confidence={photo.aiConfidence}
                    reason={photo.aiReason}
                    status={photo.aiStatus}
                    suggestedAccount={suggested}
                  />
                  <form
                    action={updateInvoiceCategory.bind(null, photo.id)}
                    className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
                  >
                    <GroupedAccountSelect defaultValue={photo.aiAccountId} />
                    <input type="hidden" name="periodMonth" value={photo.periodMonth ?? monthKeyFromDate()} />
                    <Button type="submit" size="sm" variant="outline">
                      שיבוץ ידני
                    </Button>
                  </form>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>העלאה + ניתוח</CardTitle>
          <CardDescription>
            אפשר לבחור כרטיס מראש, או להעלות בלי שיבוץ ולקבל הצעת AI לאישור.
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
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
          <EmptyState title="אין חשבוניות משובצות" description="העלו או ייבאו מסמך ושייכו לכרטיס בן." />
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
                      {photo.goodsReceipt ? ` · קליטה מול ${photo.goodsReceipt.order.supplier.name}` : ""}
                      {photo.amountIls != null ? ` · ${formatIls(photo.amountIls)}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <a href={fileUrl} target="_blank" rel="noreferrer">
                      {photo.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl}
                          alt={photo.originalName}
                          className="h-40 w-full rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg border bg-muted text-sm">
                          קובץ מצורף
                        </div>
                      )}
                    </a>
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

      <AccountRollup rows={rollup} />
    </div>
  );
}
