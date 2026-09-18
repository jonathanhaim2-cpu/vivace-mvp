import Link from "next/link";
import { AuditInfoButton } from "@/components/audit-info-button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentTypeBadge } from "@/components/invoices/document-type-control";
import { AUDIT_ACTIONS, firstAuditsFor, formatAuditStamp } from "@/lib/audit";
import { INVOICE_SOURCE, RECEIPT_STATUSES, invoiceSourceLabel } from "@/lib/constants";
import { formatDateTime, receiptStatusLabel } from "@/lib/format";
import { monthLabel, monthRangeUtc, parseMonthParam, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; q?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const status = params.status?.trim() ?? "";
  const q = params.q?.trim() ?? "";
  const branchId = params.branch?.trim() ?? "";
  const range = month ? monthRangeUtc(month) : null;

  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      ...(session.isNetwork
        ? branchId
          ? { order: { branchId } }
          : {}
        : { order: { branchId: session.branchId ?? undefined } }),
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      ...(status ? { status } : {}),
      ...(q ? { order: { supplier: { name: { contains: q } } } } : {}),
    },
    include: {
      order: { include: { supplier: true, branch: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const importedPhotos = await prisma.invoicePhoto.findMany({
    where: {
      isDuplicate: false,
      source: { in: [INVOICE_SOURCE.EMAIL, INVOICE_SOURCE.BULK_IMPORT] },
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      ...(session.isNetwork
        ? branchId
          ? { OR: [{ branchId }, { goodsReceipt: { order: { branchId } } }] }
          : {}
        : {
            OR: [
              { branchId: session.branchId ?? undefined },
              { goodsReceipt: { order: { branchId: session.branchId ?? undefined } } },
            ],
          }),
      ...(q
        ? {
            OR: [
              { originalName: { contains: q } },
              { aiSupplierName: { contains: q } },
              { goodsReceipt: { order: { supplier: { name: { contains: q } } } } },
            ],
          }
        : {}),
    },
    include: {
      branch: true,
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const actors = await firstAuditsFor(
    "GoodsReceipt",
    receipts.map((receipt) => receipt.id),
    AUDIT_ACTIONS.RECEIPT_SUBMIT,
  );

  return (
    <div>
      <PageHeader
        title="קליטת סחורה"
        description="קליטות מול הזמנה וגם מסמכים שיובאו ממייל/תיקייה. חודש לפי שעון ירושלים."
      />
      <FilterBar>
        <CompactField label="חודש" htmlFor="receipts-month">
          <NativeSelect id="receipts-month" name="month" defaultValue={month ?? "all"}>
            <option value="all">כל החודשים</option>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="סטטוס" htmlFor="receipts-status">
          <NativeSelect id="receipts-status" name="status" defaultValue={status}>
            <option value="">הכל</option>
            {Object.values(RECEIPT_STATUSES).map((value) => (
              <option key={value} value={value}>
                {receiptStatusLabel(value)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="receipts-branch">
            <NativeSelect id="receipts-branch" name="branch" defaultValue={branchId}>
              <option value="">כל הסניפים</option>
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
        ) : null}
        <CompactField label="חיפוש" htmlFor="receipts-q" grow>
          <Input id="receipts-q" name="q" defaultValue={q} placeholder="שם ספק" />
        </CompactField>
      </FilterBar>
      {receipts.length === 0 ? (
        <EmptyState
          title="אין קליטות מול הזמנה"
          description={
            month
              ? `אין קליטות ב־${monthLabel(month)} לפי הסינון.${importedPhotos.length ? ` יש ${importedPhotos.length} מסמכים מייבוא למטה.` : ""}`
              : "פתחו הזמנה שנשלחה וקלטו מולה את הסחורה."
          }
          action={{ href: "/orders", label: "אל ההזמנות" }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>סניף</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>שורות</TableHead>
              <TableHead>סטטוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Link href={`/receipts/${receipt.id}`} className="font-medium hover:underline">
                      {receipt.order.supplier.name}
                    </Link>
                    <AuditInfoButton stamp={formatAuditStamp(actors.get(receipt.id))} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{receipt.order.branch.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(receipt.createdAt)}
                </TableCell>
                <TableCell>{receipt.lines.length}</TableCell>
                <TableCell>
                  <ReceiptStatusBadge status={receipt.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {importedPhotos.length > 0 ? (
        <div className="mt-6">
          <CompactPanel
            title={`מסמכים מייבוא · ${importedPhotos.length}`}
            description="מייל ותיקייה נספרים גם בלי הזמנה. חודש לפי תאריך הקליטה בשעון ירושלים."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מסמך</TableHead>
                  <TableHead>מקור</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>סניף</TableHead>
                  <TableHead>תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedPhotos.map((photo) => (
                  <TableRow key={photo.id}>
                    <TableCell>
                      <Link href="/invoices" className="font-medium hover:underline">
                        {photo.aiSupplierName || photo.originalName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{invoiceSourceLabel(photo.source)}</TableCell>
                    <TableCell>
                      <DocumentTypeBadge value={photo.documentType} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(photo.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CompactPanel>
        </div>
      ) : null}
    </div>
  );
}
