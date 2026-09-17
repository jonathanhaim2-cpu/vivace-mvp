import { approveSupplierPayment, requestKarteset, toggleExpenseFlags } from "@/actions/ap";
import { PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Button } from "@/components/ui/button";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="ap-month">
          <NativeSelect id="ap-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>
      <ReportExportButtons report="ap" month={month} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין רכש בחודש זה.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>לתשלום</TableHead>
              <TableHead>רכש</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.supplier.id}>
                <TableCell>
                  <p className="font-medium">{row.supplier.name}</p>
                  {row.supplier.accountingEmail ? (
                    <p className="text-xs text-muted-foreground">{row.supplier.accountingEmail}</p>
                  ) : null}
                </TableCell>
                <TableCell>{formatIls(row.amountDue)}</TableCell>
                <TableCell>{formatIls(row.purchased)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.ap?.approvedForPayment ? `אושר (${payMethodLabel(row.ap.payMethod)})` : "ממתין"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={requestKarteset.bind(null, row.supplier.id)}>
                      <input type="hidden" name="month" value={month} />
                      <Button type="submit" size="sm" variant="outline">
                        {row.ap?.kartesetStatus === "QUEUED" ? "כרטסת בתור" : "כרטסת"}
                      </Button>
                    </form>
                    <form action={approveSupplierPayment.bind(null, row.supplier.id)} className="flex items-center gap-1.5">
                      <input type="hidden" name="month" value={month} />
                      <NativeSelect
                        name="payMethod"
                        defaultValue={row.ap?.payMethod ?? row.supplier.paymentMethod ?? "TRANSFER"}
                        className="w-32"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button type="submit" size="sm">
                        אישור
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CompactPanel
        title="הוצאות לא מרכש"
        description="שולם + נשלח להנה״ח. אחרי ה-10 לחודש, פריטים שלא סומנו אדומים בבית."
      >
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין הוצאות ידניות בחודש זה.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((item) => (
              <form key={item.id} action={toggleExpenseFlags.bind(null, item.id)} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <p className="text-sm font-medium">{item.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {expenseCategoryLabel(item.accountId)} · {item.amountIls != null ? formatIls(item.amountIls) : "ללא סכום"}
                  </p>
                </div>
                <CompactField label="תשלום" htmlFor={`paid-${item.id}`}>
                  <NativeSelect id={`paid-${item.id}`} name="paid" defaultValue={item.paid ? "on" : "off"}>
                    <option value="off">לא שולם</option>
                    <option value="on">שולם</option>
                  </NativeSelect>
                </CompactField>
                <CompactField label="הנה״ח" htmlFor={`sent-${item.id}`}>
                  <NativeSelect
                    id={`sent-${item.id}`}
                    name="sentToAccountant"
                    defaultValue={item.sentToAccountant ? "on" : "off"}
                  >
                    <option value="off">לא נשלח</option>
                    <option value="on">נשלח</option>
                  </NativeSelect>
                </CompactField>
                <Button type="submit" size="sm" variant="outline">
                  שמירה
                </Button>
              </form>
            ))}
          </div>
        )}
      </CompactPanel>
    </div>
  );
}
