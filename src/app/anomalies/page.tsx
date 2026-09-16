import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExceptionActions } from "@/components/exceptions/exception-actions";
import { exceptionKindLabel } from "@/lib/credits";
import { getAnomalies } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate } from "@/lib/months";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

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

      <div className="flex flex-wrap gap-2 text-xs">
        {TYPES.map((item) => (
          <Link
            key={item.value}
            href={`/anomalies?type=${item.value}${supplier ? `&supplier=${encodeURIComponent(supplier)}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1",
              type === item.value && "border-primary bg-primary/10",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {suppliers.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/anomalies?type=${type}`}
            className={cn("rounded-full border px-3 py-1", !supplier && "border-primary bg-primary/10")}
          >
            כל הספקים
          </Link>
          {suppliers.map((name) => (
            <Link
              key={name}
              href={`/anomalies?type=${type}&supplier=${encodeURIComponent(name)}`}
              className={cn(
                "rounded-full border px-3 py-1",
                supplier === name && "border-primary bg-primary/10",
              )}
            >
              {name}
            </Link>
          ))}
        </div>
      ) : null}

      {showExceptional ? (
        <Card>
          <CardHeader>
            <CardTitle>בקשות זיכוי ומעקב חוסר</CardTitle>
            <CardDescription>{exceptionalRows.length} פריטים פתוחים עד אישור ספק / הגעת סחורה.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exceptionalRows.length === 0 ? (
              <p className="text-muted-foreground">אין מסמכים חריגים בסינון זה.</p>
            ) : (
              exceptionalRows.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <Link
                    href={item.goodsReceiptId ? `/receipts/${item.goodsReceiptId}` : "/anomalies"}
                    className="font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {exceptionKindLabel(item.kind)} · {item.supplier.name}
                    {session.isNetwork ? ` · ${item.branch.name}` : ""}
                    {item.amountIls > 0 ? ` · ${formatIls(item.amountIls)}` : ""}
                  </p>
                  <div className="mt-2">
                    <ExceptionActions id={item.id} kind={item.kind} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {showPrice ? (
        <Card>
          <CardHeader>
            <CardTitle>מחיר שונה מהמוסכם</CardTitle>
            <CardDescription>{priceRows.length} קליטות ממתינות לאישור.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {priceRows.length === 0 ? (
              <p className="text-muted-foreground">אין חריגות מחיר בסינון זה.</p>
            ) : (
              priceRows.map((receipt) => (
                <Link key={receipt.id} href={`/receipts/${receipt.id}`} className="flex justify-between hover:underline">
                  <span>
                    {receipt.order.supplier.name}
                    {session.isNetwork ? ` · ${receipt.order.branch.name}` : ""}
                  </span>
                  <span className="text-muted-foreground">לאישור מחיר</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {showMissing ? (
        <Card>
          <CardHeader>
            <CardTitle>חוסרים בקליטה</CardTitle>
            <CardDescription>{missingRows.length} שורות מסומנות כחסרות.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {missingRows.length === 0 ? (
              <p className="text-muted-foreground">אין חוסרים בסינון זה.</p>
            ) : (
              missingRows.map((line) => (
                <Link
                  key={line.id}
                  href={`/receipts/${line.goodsReceiptId}`}
                  className="flex justify-between hover:underline"
                >
                  <span>
                    {line.orderLine.product.name} · {line.goodsReceipt.order.supplier.name}
                  </span>
                  <span className="text-muted-foreground">
                    התקבל {line.receivedQty} במקום {line.orderLine.qty}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {showUnclassified ? (
        <Card>
          <CardHeader>
            <CardTitle>חשבוניות ללא כרטיס</CardTitle>
            <CardDescription>
              {anomalies.unclassified === 0 ? "הכול מסווג." : `${anomalies.unclassified} ממתינות בסיווג.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {anomalies.unclassified > 0 ? (
              <Link href="/invoices" className="text-sm text-primary hover:underline">
                מעבר לתור הסיווג
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">אין מסמכים פתוחים.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
