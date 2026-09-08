import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnomalies } from "@/lib/dashboard";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPES = [
  { value: "all", label: "הכל" },
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
    ]),
  ).sort((a, b) => a.localeCompare(b, "he"));

  const priceRows = anomalies.pricePending.filter((row) =>
    !supplier || row.order.supplier.name === supplier,
  );
  const missingRows = anomalies.missing.filter((row) =>
    !supplier || row.goodsReceipt.order.supplier.name === supplier,
  );
  const showPrice = type === "all" || type === "price";
  const showMissing = type === "all" || type === "missing";
  const showUnclassified = type === "all" || type === "unclassified";

  return (
    <div className="space-y-6">
      <PageHeader
        title="חריגות מחיר ומסמך"
        description="סינון לפי סוג וספק. אישור מחיר נשאר במשרד הרשת."
      />

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
