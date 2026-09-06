import { uploadStandaloneInvoice, updateInvoiceCategory } from "@/actions/invoices";
import { AccountPicker } from "@/components/accounts/account-picker";
import { AccountRollup } from "@/components/accounts/account-rollup";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccountRollup } from "@/lib/accounts";
import { expenseCategoryLabel, formatDateTime, formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage() {
  const [photos, rollup] = await Promise.all([
    prisma.invoicePhoto.findMany({
      include: {
        account: { include: { parent: true } },
        goodsReceipt: { include: { order: { include: { supplier: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAccountRollup(),
  ]);

  const counts = Object.fromEntries(rollup.flatMap((parent) => parent.children.map((child) => [child.id, child.documents])));

  return (
    <div className="space-y-8">
      <PageHeader
        title="חשבוניות וסיווג"
        description="תבנית הנה״ח של ויואצ'ה: כרטיסי בן לשיבוץ, וקטגוריות אב לסיכום. סנכרון תיבת מייל עדיין מחוץ ל-MVP."
      />

      <Alert>
        <AlertTitle>TODO · מחוץ ל-MVP</AlertTitle>
        <AlertDescription>
          סנכרון תיבת המייל של הנהלת החשבונות ופענוח אוטומטי. כרגע: העלאה ידנית, שיוך לכרטיס בן, ודוח שמתגלגל לאב.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>העלאה ושיוך לכרטיס</CardTitle>
          <CardDescription>
            בחרו כרטיס בן מהמבנה המדויק של יונתן. לא משייכים לקטגוריית אב — האב נמדד בסיכום.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadStandaloneInvoice} className="space-y-5">
            <AccountPicker defaultValue="acc_food_misc" counts={counts} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="photo">צילום / קובץ</FieldLabel>
                <Input id="photo" name="photo" type="file" accept="image/*,application/pdf" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="amountIls">סכום ללא מע״מ (אופציונלי)</FieldLabel>
                <Input id="amountIls" name="amountIls" type="number" min={0} step="0.01" />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="voiceNoteText">תמליל הערת קול (זמני)</FieldLabel>
                <Textarea
                  id="voiceNoteText"
                  name="voiceNoteText"
                  placeholder="למשל: חשמל ספטמבר, או ירקות מהשרון"
                />
                <FieldDescription>במקום הקלטה אמיתית — שדה טקסט שמדמה הערת קול קצרה.</FieldDescription>
              </Field>
            </div>
            <Button type="submit">שמירת חשבונית לכרטיס שנבחר</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">מסמכים ששובצו</h2>
        {photos.length === 0 ? (
          <EmptyState title="אין חשבוניות" description="העלו צילום ראשון או קלטו הזמנה עם מסמך." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {photos.map((photo) => (
              <Card key={photo.id}>
                <CardHeader>
                  <CardTitle className="text-base">{photo.originalName}</CardTitle>
                  <CardDescription>
                    {formatDateTime(photo.createdAt)}
                    {photo.goodsReceipt
                      ? ` · קליטה מול ${photo.goodsReceipt.order.supplier.name}`
                      : " · הועלה ידנית"}
                    {photo.amountIls != null ? ` · ${formatIls(photo.amountIls)}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a href={`/uploads/${photo.fileName}`} target="_blank" rel="noreferrer">
                    {photo.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/uploads/${photo.fileName}`}
                        alt={photo.originalName}
                        className="h-40 w-full rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-lg border bg-muted text-sm">
                        קובץ מצורף
                      </div>
                    )}
                  </a>
                  {photo.voiceNoteText ? (
                    <p className="text-sm text-muted-foreground">הערת קול: {photo.voiceNoteText}</p>
                  ) : null}
                  <p className="text-sm font-medium">{expenseCategoryLabel(photo.accountId)}</p>
                  <form action={updateInvoiceCategory.bind(null, photo.id)} className="flex items-center gap-2">
                    <GroupedAccountSelect defaultValue={photo.accountId} />
                    <Button type="submit" size="sm" variant="outline">
                      שינוי
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AccountRollup rows={rollup} />
    </div>
  );
}
