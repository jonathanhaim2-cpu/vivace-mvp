import { importInboxFiles } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";

export default function InvoiceImportPage() {
  const months = recentMonthKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ייבוא מתיקייה"
        description="מדמה משיכת מייל: כמה חשבוניות בבת אחת. בלי כרטיס ברירת מחדל הן ייכנסו לתור הסיווג."
      />

      <Card>
        <CardHeader>
          <CardTitle>העלאה מרובה</CardTitle>
          <CardDescription>PDF או תמונות. אפשר לשייך מראש לכרטיס בן, או לסווג אחר כך במסך החשבוניות.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importInboxFiles} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="photos">קבצים</FieldLabel>
              <Input id="photos" name="photos" type="file" accept="image/*,application/pdf" multiple required />
              <FieldDescription>בחירה מרובה מתיקיית ההורדות, כמו מצורפים מתיבת המייל.</FieldDescription>
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
              <FieldLabel htmlFor="accountId">כרטיס בן (אופציונלי)</FieldLabel>
              <GroupedAccountSelect id="accountId" allowEmpty required={false} />
              <FieldDescription>ריק = המסמכים מחכים ב«ממתינות לסיווג».</FieldDescription>
            </Field>
            <Button type="submit">ייבוא לתור</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
