import { uploadStandaloneInvoice, updateInvoiceCategory } from "@/actions/invoices";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { expenseCategoryLabel, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage() {
  const photos = await prisma.invoicePhoto.findMany({
    include: { goodsReceipt: { include: { order: { include: { supplier: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="חשבוניות והוצאות"
        description="שיוך צילום חשבונית לקטגוריה. תבנית מתוך הערת קול קצרה — בלי סנכרון תיבת דואר."
      />

      <Alert>
        <AlertTitle>TODO · מחוץ ל-MVP</AlertTitle>
        <AlertDescription>
          סנכרון תיבת מייל של הנהלת חשבונות, פענוח אוטומטי של חשבוניות, ודוחות AI. כרגע יש רק העלאה ידנית ושיוך לקטגוריה
          (עלות מזון, עובדים, חשמל, אחר).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>העלאת חשבונית</CardTitle>
          <CardDescription>
            אפשר להדביק תמליל קצר כאילו הגיע מהערת קול, ולבחור קטגוריה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadStandaloneInvoice} className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="photo">צילום / קובץ</FieldLabel>
              <Input id="photo" name="photo" type="file" accept="image/*,application/pdf" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="expenseCategory">קטגוריה</FieldLabel>
              <select
                id="expenseCategory"
                name="expenseCategory"
                defaultValue="FOOD"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="voiceNoteText">תמליל הערת קול (זמני)</FieldLabel>
              <Textarea
                id="voiceNoteText"
                name="voiceNoteText"
                placeholder="למשל: חשמל חודש ספטמבר, או משכורת טבח"
              />
              <FieldDescription>במקום הקלטה אמיתית — שדה טקסט שמדמה הערת קול קצרה.</FieldDescription>
            </Field>
            <Button type="submit">שמירת חשבונית</Button>
          </form>
        </CardContent>
      </Card>

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
                <form action={updateInvoiceCategory.bind(null, photo.id)} className="flex items-center gap-2">
                  <select
                    name="expenseCategory"
                    defaultValue={photo.expenseCategory ?? "OTHER"}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    שינוי
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">{expenseCategoryLabel(photo.expenseCategory)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
