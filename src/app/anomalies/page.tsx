import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { ExceptionActions } from "@/components/exceptions/exception-actions";
import { exceptionKindLabel } from "@/lib/credits";
import { getAnomalies } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate } from "@/lib/months";
import { getAppSession } from "@/lib/session";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const TYPES = [
  { value: "all", label: "הכל" },
  { value: "exceptional", label: "מסמכים חריגים" },
  { value: "price", label: "מחיר שונה" },
  { value: "missing", label: "חוסר" },
  { value: "unclassified", label: "ללא סיווג" },
] as const;

export default async function AnomaliesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; supplier?: string }>;
}) {
  const { type = "all", supplier = "" } = await searchParams;
  const session = await getAppSession();
  const branchId = session.isNetwork ? null : session.branchId;
  const anomalies = await getAnomalies(branchId);

  const suppliers = Array.from(
    new Set([
      ...anomalies.pricePending.map((r) => r.order.supplier.name),
      ...anomalies.missing.map((l) => l.goodsReceipt.order.supplier.name),
      ...anomalies.exceptional.map((item) => item.supplier.name),
    ]),
  ).sort((a, b) => a.localeCompare(b, "he"));

  const exceptionalRows = anomalies.exceptional.filter((row) => !supplier || row.supplier.name === supplier);
  const priceRows = anomalies.pricePending.filter((row) =>
    !supplier || row.order.supplier.name === supplier,
  );
  const missingRows = anomalies.missing.filter((row) =>
    !supplier || row.goodsReceipt.order.supplier.name === supplier,
  );
  const showExceptional = type === "all" || type === "exceptional";
  const showPrice = type === "all" || type === "price";
  const showMissing = type === "all" || type === "missing";
  const showUnclassified = type === "all" || type === "unclassified";

  return (
    <div className="space-y-6">
      <PageHeader
        title="מסמכים חריגים"
        description="בקשות זיכוי פתוחות, חוסר בלי זיכוי, פריטים בדרך, וחריגות מחיר."
      />
      <ReportExportButtons report="anomalies" month={monthKeyFromDate()} />

      <FilterBar>
        <CompactField label="סוג" htmlFor="anom-type">
          <NativeSelect id="anom-type" name="type" defaultValue={type}>
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="ספק" htmlFor="anom-supplier" grow>
          <NativeSelect id="anom-supplier" name="supplier" defaultValue={supplier}>
            <option value="">כל הספקים</option>
            {suppliers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>

      {showExceptional ? (
        <CompactPanel title="בקשות זיכוי ומעקב חוסר" description={`${exceptionalRows.length} פריטים פתוחים עד אישור ספק / הגעת סחורה.`}>
          {exceptionalRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין מסמכים חריגים בסינון זה.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>פריט</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>ספק</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptionalRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={item.goodsReceiptId ? `/receipts/${item.goodsReceiptId}` : "/anomalies"}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{exceptionKindLabel(item.kind)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplier.name}
                      {session.isNetwork ? ` · ${item.branch.name}` : ""}
                    </TableCell>
                    <TableCell>{item.amountIls > 0 ? formatIls(item.amountIls) : "—"}</TableCell>
                    <TableCell>
                      <ExceptionActions id={item.id} kind={item.kind} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CompactPanel>
      ) : null}

      {showPrice ? (
        <CompactPanel title="מחיר שונה מהמוסכם" description={`${priceRows.length} קליטות ממתינות לאישור.`}>
          {priceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין חריגות מחיר בסינון זה.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ספק</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceRows.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <Link href={`/receipts/${receipt.id}`} className="font-medium hover:underline">
                        {receipt.order.supplier.name}
                        {session.isNetwork ? ` · ${receipt.order.branch.name}` : ""}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">לאישור מחיר</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CompactPanel>
      ) : null}

      {showMissing ? (
        <CompactPanel title="חוסרים בקליטה" description={`${missingRows.length} שורות מסומנות כחסרות.`}>
          {missingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין חוסרים בסינון זה.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מוצר</TableHead>
                  <TableHead>ספק</TableHead>
                  <TableHead>כמות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingRows.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Link href={`/receipts/${line.goodsReceiptId}`} className="font-medium hover:underline">
                        {line.orderLine.product.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{line.goodsReceipt.order.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      התקבל {line.receivedQty} במקום {line.orderLine.qty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CompactPanel>
      ) : null}

      {showUnclassified ? (
        <CompactPanel
          title="חשבוניות ללא קטגוריה"
          description={anomalies.unclassified === 0 ? "הכול מסווג." : `${anomalies.unclassified} ממתינות בסיווג.`}
        >
          {anomalies.unclassified > 0 ? (
            <Link href="/invoices" className="text-sm text-primary hover:underline">
              מעבר לתור הסיווג
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">אין מסמכים פתוחים.</p>
          )}
        </CompactPanel>
      ) : null}

    </div>
  );
}
