import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { InvoicePreviewButton } from "@/components/invoices/invoice-preview-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFoodCostInvoices, getFoodCostSuppliers } from "@/lib/food-cost-drill";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate, monthLabel } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function FoodCostSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ supplierKey: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { supplierKey } = await params;
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const key = decodeURIComponent(supplierKey);
  const [suppliers, invoices] = await Promise.all([getFoodCostSuppliers(month), getFoodCostInvoices(month, key)]);
  const supplier = suppliers.find((row) => row.key === key);
  if (!supplier) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={supplier.name}
        description={`${monthLabel(month)} · ${formatIls(supplier.amountIls)} · ${supplier.documents} מסמכים`}
      />
      <p className="text-sm">
        <Link href={`/reports/food-cost?month=${month}`} className="text-primary hover:underline">
          חזרה לספקים
        </Link>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>מסמך</TableHead>
            <TableHead>סניף</TableHead>
            <TableHead>סכום</TableHead>
            <TableHead>הזמנה / צילום</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.originalName}</TableCell>
              <TableCell className="text-muted-foreground">{row.branchName ?? "—"}</TableCell>
              <TableCell>{formatIls(row.amountIls)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <InvoicePreviewButton fileUrl={row.fileUrl} originalName={row.originalName} mimeType={row.mimeType} />
                  {row.orderId ? (
                    <Link href={`/orders/${row.orderId}`} className="text-xs text-primary hover:underline">
                      הזמנה
                    </Link>
                  ) : null}
                  {row.receiptId ? (
                    <Link href={`/receipts/${row.receiptId}`} className="text-xs text-primary hover:underline">
                      קליטה
                    </Link>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
