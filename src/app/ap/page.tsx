import { approveSupplierPayment, requestKarteset, toggleExpenseFlags } from "@/actions/ap";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNonProcurementChecklist, getSupplierApRows, payMethodLabel } from "@/lib/ap";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { expenseCategoryLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ApPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const [rows, expenses] = await Promise.all([getSupplierApRows(month), getNonProcurementChecklist(month)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="תשלומים לספקים"
        description={`כרטסת ל־${monthLabel(month)}. בקשת כרטסת נכנסת לתור מייל (אין מיילר ב-MVP).`}
      />

      <form className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">חודש</span>
          <select name="month" defaultValue={month} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline">
          הצגה
        </Button>
      </form>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין רכש בחודש זה.</p>
        ) : (
          rows.map((row) => (
            <Card key={row.supplier.id}>
              <CardHeader>
                <CardTitle>{row.supplier.name}</CardTitle>
                <CardDescription>
                  לתשלום {formatIls(row.amountDue)} · רכש בפועל {formatIls(row.purchased)}
                  {row.ap?.approvedForPayment ? ` · אושר לתשלום (${payMethodLabel(row.ap.payMethod)})` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <form action={requestKarteset.bind(null, row.supplier.id)}>
                  <input type="hidden" name="month" value={month} />
                  <Button type="submit" size="sm" variant="outline">
                    {row.ap?.kartesetStatus === "QUEUED" ? "כרטסת בתור מייל" : "בקשת כרטסת (1 לחודש)"}
                  </Button>
                </form>
                {row.supplier.accountingEmail ? (
                  <span className="self-center text-xs text-muted-foreground">{row.supplier.accountingEmail}</span>
                ) : null}
                <form action={approveSupplierPayment.bind(null, row.supplier.id)} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="month" value={month} />
                  <select
                    name="payMethod"
                    defaultValue={row.ap?.payMethod ?? row.supplier.paymentMethod ?? "TRANSFER"}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm">
                    אישור לתשלום
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הוצאות לא מרכש</CardTitle>
          <CardDescription>שולם + נשלח להנה״ח. אחרי ה-10 לחודש, פריטים שלא סומנו אדומים בבית.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין הוצאות ידניות בחודש זה.</p>
          ) : (
            expenses.map((item) => (
              <form
                key={item.id}
                action={toggleExpenseFlags.bind(null, item.id)}
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {expenseCategoryLabel(item.accountId)} · {item.amountIls != null ? formatIls(item.amountIls) : "ללא סכום"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="paid" defaultChecked={item.paid} />
                    שולם
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="sentToAccountant" defaultChecked={item.sentToAccountant} />
                    נשלח להנה״ח
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    שמירה
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
