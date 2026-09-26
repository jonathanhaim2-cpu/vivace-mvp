import { assignInvoiceToExpense, createRecurringLine, deleteRecurringLine, unassignInvoiceExpense } from "@/actions/recurring";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatIls, nowInIsrael } from "@/lib/format";
import { listMissingInvoiceAlerts } from "@/lib/missing-invoice-alerts";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getAppSession();
  const clock = nowInIsrael();
  const [recurring, suppliers, branches, links, invoices, alerts] = await Promise.all([
    prisma.recurringLine.findMany({ include: { supplier: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.invoiceExpenseLink.findMany({
      include: { invoicePhoto: true, recurringLine: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.invoicePhoto.findMany({
      where: { isDuplicate: false, approvalStatus: "APPROVED", expenseLink: { is: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, originalName: true, aiSupplierName: true },
    }),
    listMissingInvoiceAlerts({
      today: { year: clock.year, month: clock.month, date: clock.date },
      branchId: session.branchId,
    }),
  ]);
  const expense = recurring.filter((row) => row.kind === "EXPENSE").reduce((sum, row) => sum + row.amountIls, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="הוצאות קבועות / משתנות"
        description="שכירות וספקים שוטפים. חשבונית שמגיעה משויכת לפי ספק או מילות מפתח, ואפשר גם לשייך ידנית."
      />
      {alerts.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <h2 className="text-sm font-semibold text-destructive">חסרות חשבוניות</h2>
          <ul className="space-y-1 text-sm text-destructive">
            {alerts.map((alert) => (
              <li key={alert.id}>{alert.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
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
                  <TableCell className="font-medium">
                    {row.name}
                    {row.supplier ? <span className="block text-xs text-muted-foreground">{row.supplier.name}</span> : null}
                    {row.keywords ? <span className="block text-xs text-muted-foreground">{row.keywords}</span> : null}
                  </TableCell>
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
          <CompactField label="ספק" htmlFor="supplierId">
            <NativeSelect id="supplierId" name="supplierId" defaultValue="">
              <option value="">בלי ספק</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="סניף / רשת" htmlFor="branchId">
            <NativeSelect id="branchId" name="branchId" defaultValue="">
              <option value="">כל הרשת</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="מילות מפתח" htmlFor="keywords" grow>
            <Input id="keywords" name="keywords" placeholder="שכירות, ארנונה" />
          </CompactField>
          <CompactField label="חשבוניות צפויות בחודש" htmlFor="expectedInvoicesPerMonth">
            <Input id="expectedInvoicesPerMonth" name="expectedInvoicesPerMonth" type="number" min={0} step={1} placeholder="ממוצע" />
          </CompactField>
          <Button type="submit">הוספה</Button>
        </CompactForm>
      </CompactPanel>
      <CompactPanel title="שיוך חשבונית להוצאה" description="שיוך ידני גובר על שיוך אוטומטי.">
        <CompactForm action={assignInvoiceToExpense}>
          <CompactField label="חשבונית" htmlFor="invoicePhotoId" grow>
            <NativeSelect id="invoicePhotoId" name="invoicePhotoId" defaultValue="">
              <option value="">בחירה</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.originalName}
                  {invoice.aiSupplierName ? ` · ${invoice.aiSupplierName}` : ""}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="הוצאה" htmlFor="recurringLineId">
            <NativeSelect id="recurringLineId" name="recurringLineId" defaultValue="">
              <option value="">בחירה</option>
              {recurring
                .filter((row) => row.kind === "EXPENSE")
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </NativeSelect>
          </CompactField>
          <Button type="submit">שיוך</Button>
        </CompactForm>
        <ul className="mt-3 space-y-1 text-sm">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-2">
              <span>
                {link.invoicePhoto.originalName} → {link.recurringLine.name}
                <span className="text-xs text-muted-foreground"> · {link.source === "MANUAL" ? "ידני" : "אוטומטי"}</span>
              </span>
              <form action={unassignInvoiceExpense.bind(null, link.id)}>
                <Button type="submit" size="sm" variant="ghost">
                  ביטול שיוך
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </CompactPanel>
    </div>
  );
}
