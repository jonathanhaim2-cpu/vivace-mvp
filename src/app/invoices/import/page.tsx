import { importInboxFiles } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { monthLabel, recentMonthKeys } from "@/lib/months";

export default function InvoiceImportPage() {
  const months = recentMonthKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ייבוא מתיקייה"
        description="מעלים כמה חשבוניות בבת אחת. כל קובץ נכנס לתור הסיווג, ו-AI מציע תאריך וקטגוריה לאישור — בלי לבחור מראש לכל האצווה."
      />

      <Card>
        <CardHeader>
          <CardTitle>העלאה מרובה</CardTitle>
          <CardDescription>
            PDF או תמונות. אין צורך לבחור חודש או קטגוריה לכל הקבצים. ה-AI מחלץ אותם מכל מסמך, ואתם מאשרים או מתקנים בתור.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importInboxFiles} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="photos">קבצים</FieldLabel>
              <Input id="photos" name="photos" type="file" accept="image/*,application/pdf" multiple required />
              <FieldDescription>בחירה מרובה מתיקיית ההורדות, כמו מצורפים מתיבת המייל.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="periodMonth">חודש לדיווח (אופציונלי)</FieldLabel>
              <select
                id="periodMonth"
                name="periodMonth"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">אוטומטי — לפי תאריך החשבונית</option>
                {months.map((key) => (
                  <option key={key} value={key}>
                    {monthLabel(key)}
                  </option>
                ))}
              </select>
              <FieldDescription>
                ריק = לכל חשבונית ייגזר חודש הדיווח מתאריך המסמך שזיהה ה-AI. בחירה כאן דורסת רק אם צריך אחידות לכל האצווה.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="accountId">קטגוריה (אופציונלי)</FieldLabel>
              <GroupedAccountSelect id="accountId" allowEmpty required={false} />
              <FieldDescription>
                ברירת המחדל: ללא שיבוץ — לתור הסיווג. ה-AI יציע קטגוריה לכל חשבונית בנפרד; תאשרו או תערכו שם.
              </FieldDescription>
            </Field>
            <Button type="submit">ייבוא לתור</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
