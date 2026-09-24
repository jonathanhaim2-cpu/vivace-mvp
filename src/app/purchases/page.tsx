import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { formatDateTime, formatIls } from "@/lib/format";
import { signedDocumentAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const session = await getAppSession();
  const branchFilter = session.isNetwork ? session.branchId : session.branchId;
  const [receipts, invoices] = await Promise.all([
    prisma.goodsReceipt.findMany({
      where: branchFilter ? { order: { branchId: branchFilter } } : {},
      include: { order: { include: { supplier: true, branch: true } }, lines: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.invoicePhoto.findMany({
      where: {
        ...INVOICE_IN_TOTALS_WHERE,
        ...(branchFilter
          ? { OR: [{ branchId: branchFilter }, { goodsReceipt: { order: { branchId: branchFilter } } }] }
          : {}),
      },
      include: { goodsReceipt: { include: { order: { include: { supplier: true } } } }, branch: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="רכש"
        description="רכש הוא מה שהתקבל וחויב: קליטת סחורה וחשבוניות שאושרו. הזמנה היא מה ששולחים לספק — היא נמצאת תחת הזמנות."
        action={{ href: "/orders", label: "להזמנות" }}
      />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">קליטות אחרונות</h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין קליטות בטווח הזה.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ספק</TableHead>
                <TableHead>סניף</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סכום</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => {
                const total = receipt.lines.reduce((sum, line) => sum + line.receivedQty * line.invoicePrice, 0);
                return (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <Link href={`/receipts/${receipt.id}`} className="font-medium hover:underline">
                        {receipt.order.supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell>{receipt.order.branch.name}</TableCell>
                    <TableCell>{formatDateTime(receipt.createdAt)}</TableCell>
                    <TableCell className="tabular-nums">{formatIls(total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">חשבוניות שאושרו</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין חשבוניות מאושרות.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מסמך</TableHead>
                <TableHead>ספק</TableHead>
                <TableHead>סכום</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((photo) => (
                <TableRow key={photo.id}>
                  <TableCell>
                    <a href={publicFileUrl(photo.fileName)} className="font-medium hover:underline" target="_blank" rel="noreferrer">
                      {photo.originalName}
                    </a>
                  </TableCell>
                  <TableCell>{photo.goodsReceipt?.order.supplier.name ?? photo.aiSupplierName ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{formatIls(signedDocumentAmount(photo))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
