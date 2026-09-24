import Link from "next/link";
import { ReportsNav } from "@/components/reports/reports-nav";
import { PageHeader } from "@/components/page-header";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { getCategoryFill, getForecastTurnover } from "@/lib/dashboard";
import { formatIls } from "@/lib/format";
import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { monthKeyFromDate, monthLabel, monthRangeUtc, recentMonthKeys } from "@/lib/months";
import { signedDocumentAmount } from "@/lib/money";
import { parentCategoryIdForAccount, UNCATEGORIZED_PURCHASE_ID } from "@/lib/purchase-fill";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { publicFileUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; supplier?: string; account?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKeyFromDate();
  const category = params.category?.trim() ?? "";
  const supplier = params.supplier?.trim() ?? "";
  const account = params.account?.trim() ?? "";
  const session = await getAppSession();
  const branchId = session.branchId;
  const forecast = await getForecastTurnover();
  const fill = await getCategoryFill(month, forecast, branchId);
  const { start, end } = monthRangeUtc(month);

  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      ...(branchId ? { order: { branchId } } : {}),
    },
    include: {
      order: { include: { supplier: true, branch: true } },
      lines: { include: { orderLine: { include: { product: { include: { category: true } } } } } },
      photos: true,
    },
  });

  const categories = await prisma.productCategory.findMany({ select: { id: true, parentId: true, accountId: true, name: true } });

  type SupplierBucket = { id: string; name: string; amount: number };
  const bySupplier = new Map<string, SupplierBucket>();
  if (category) {
    for (const receipt of receipts) {
      let amount = 0;
      for (const line of receipt.lines) {
        const cat = line.orderLine.product.category;
        const parentId = cat?.parentId ?? cat?.id ?? UNCATEGORIZED_PURCHASE_ID;
        const childId = cat?.id ?? UNCATEGORIZED_PURCHASE_ID;
        if (category !== parentId && category !== childId) continue;
        amount += line.receivedQty * line.invoicePrice;
      }
      if (amount === 0) continue;
      const current = bySupplier.get(receipt.order.supplierId) ?? {
        id: receipt.order.supplierId,
        name: receipt.order.supplier.name,
        amount: 0,
      };
      current.amount += amount;
      bySupplier.set(receipt.order.supplierId, current);
    }
  }

  const photos = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
      ...(account ? { accountId: account } : {}),
    },
    include: {
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const invoiceRows = photos.filter((photo) => {
    const attributed = photo.branchId ?? photo.goodsReceipt?.order.branchId ?? null;
    if (branchId && attributed !== branchId) return false;
    if (supplier) {
      const sid = photo.goodsReceipt?.order.supplierId;
      if (sid !== supplier && photo.aiSupplierName !== supplier) return false;
    }
    if (category && !account) {
      const parent = parentCategoryIdForAccount(photo.accountId, categories) ?? UNCATEGORIZED_PURCHASE_ID;
      const receiptMatch = photo.goodsReceipt?.order.supplierId === supplier;
      if (parent !== category && !receiptMatch) return false;
    }
    return true;
  });

  const showInvoices = Boolean(supplier || account);

  return (
    <div className="space-y-4">
      <PageHeader
        title="פירוק סכום"
        description="קטגוריה ← ספק ← חשבונית. כל שורה נפתחת למסמך כדי לאתר טעות במקור."
      />
      <ReportsNav />
      <FilterBar>
        <CompactField label="חודש" htmlFor="drill-month">
          <NativeSelect id="drill-month" name="month" defaultValue={month}>
            {recentMonthKeys(18).map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
      </FilterBar>

      {!category && !account ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {fill.map((row) => (
            <li key={row.id}>
              <Link
                href={`/reports/drill?month=${month}&category=${row.id}`}
                className="flex items-baseline justify-between gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <span className="font-medium">{row.name}</span>
                <span className="tabular-nums">{formatIls(row.spent)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {category && !showInvoices ? (
        <div className="space-y-2">
          <Link href={`/reports/drill?month=${month}`} className="text-xs text-primary hover:underline">
            כל הקטגוריות
          </Link>
          <p className="text-sm text-muted-foreground">
            {fill.find((row) => row.id === category)?.name ?? categories.find((row) => row.id === category)?.name ?? "קטגוריה"} ·{" "}
            {monthLabel(month)}
          </p>
          <ul className="space-y-2">
            {[...bySupplier.values()]
              .sort((a, b) => b.amount - a.amount)
              .map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/reports/drill?month=${month}&category=${category}&supplier=${row.id}`}
                    className="flex items-baseline justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
                  >
                    <span>{row.name}</span>
                    <span className="tabular-nums">{formatIls(row.amount)}</span>
                  </Link>
                </li>
              ))}
          </ul>
          {bySupplier.size === 0 ? <p className="text-sm text-muted-foreground">אין קליטות בקטגוריה בחודש הזה.</p> : null}
        </div>
      ) : null}

      {showInvoices ? (
        <div className="space-y-2">
          <Link
            href={category ? `/reports/drill?month=${month}&category=${category}` : `/reports/drill?month=${month}`}
            className="text-xs text-primary hover:underline"
          >
            חזרה
          </Link>
          <ul className="space-y-2">
            {invoiceRows.map((photo) => (
              <li key={photo.id} className="rounded-2xl border bg-card px-4 py-3">
                <a href={publicFileUrl(photo.fileName)} className="font-medium hover:underline" target="_blank" rel="noreferrer">
                  {photo.originalName}
                </a>
                <p className="text-xs text-muted-foreground">
                  {photo.goodsReceipt?.order.supplier.name ?? photo.aiSupplierName ?? "ספק"} ·{" "}
                  {photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? "רשת"} · {formatIls(signedDocumentAmount(photo))}
                </p>
              </li>
            ))}
          </ul>
          {invoiceRows.length === 0 ? <p className="text-sm text-muted-foreground">אין מסמכים לפי הסינון.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
