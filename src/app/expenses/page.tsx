import { createRecurringLine, deleteRecurringLine } from "@/actions/recurring";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const recurring = await prisma.recurringLine.findMany({ orderBy: { name: "asc" } });
  const expense = recurring.filter((row) => row.kind === "EXPENSE").reduce((sum, row) => sum + row.amountIls, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="הוצאות קבועות"
        description="שכירות ודומיה — מחוץ לקטלוג ספקי רכש. נכנסות לתזרים לפי יום חיוב."
      />
      <CompactPanel title={`סה״כ הוצאות ${formatIls(expense)}`}>
        {recurring.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין הוצאות עדיין.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>אמצעי</TableHead>
                <TableHead>יום חיוב</TableHead>
                <TableHead>סכום</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurring.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.kind === "INCOME" ? "הכנסה" : row.cadence === "FIXED" ? "קבוע" : "משתנה"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)?.label ?? "—"}
                  </TableCell>
                  <TableCell>{row.chargeDay ?? "—"}</TableCell>
                  <TableCell>{formatIls(row.amountIls)}</TableCell>
                  <TableCell className="text-end">
                    <form action={deleteRecurringLine.bind(null, row.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        מחיקה
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <CompactForm action={createRecurringLine} className="mt-3">
          <CompactField label="שם" htmlFor="name" grow>
            <Input id="name" name="name" required placeholder="שכירות חנות" />
          </CompactField>
          <CompactField label="סכום (₪)" htmlFor="amountIls">
            <Input id="amountIls" name="amountIls" type="number" step="0.01" required />
          </CompactField>
          <CompactField label="סוג" htmlFor="kind">
            <NativeSelect id="kind" name="kind">
              <option value="EXPENSE">הוצאה</option>
              <option value="INCOME">הכנסה</option>
            </NativeSelect>
          </CompactField>
          <CompactField label="קבוע / משתנה" htmlFor="cadence">
            <NativeSelect id="cadence" name="cadence">
              <option value="FIXED">קבוע</option>
              <option value="VARIABLE">משתנה</option>
            </NativeSelect>
          </CompactField>
          <CompactField label="אמצעי תשלום" htmlFor="paymentMethod">
            <NativeSelect id="paymentMethod" name="paymentMethod">
              <option value="">—</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="יום חיוב" htmlFor="chargeDay">
            <Input id="chargeDay" name="chargeDay" type="number" min={1} max={28} defaultValue={1} />
          </CompactField>
          <Button type="submit">הוספה</Button>
        </CompactForm>
      </CompactPanel>
    </div>
  );
}
