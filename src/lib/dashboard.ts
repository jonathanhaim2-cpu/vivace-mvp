import { nowInIsrael, nextDeliveryInfo, parseDeliveryDays, parseWeekdays, lineTotal } from "@/lib/format";
import { monthKeyFromDate, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES, RECEIPT_STATUSES } from "@/lib/constants";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { resolveSupplierForBranch } from "@/lib/supplier-branch";
import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { countsTowardInvoiceMetric, signedDocumentAmount } from "@/lib/money";
import {
  addSignedPurchaseAmount,
  overallPurchasePercent,
  standaloneInvoiceCountsForBranch,
  UNCATEGORIZED_PURCHASE_ID,
  UNCATEGORIZED_PURCHASE_NAME,
} from "@/lib/purchase-fill";

const FORECAST_KEY = "dashboard.forecastTurnoverIls";
const ROGUE_KEY = "dashboard.rogueDeviationPercent";

export type CategoryFill = {
  id: string;
  name: string;
  spent: number;
  targetPercent: number | null;
  actualPercent: number | null;
  over: boolean;
};

export async function getForecastTurnover() {
  const row = await prisma.appSetting.findUnique({ where: { key: FORECAST_KEY } });
  const value = Number(row?.value ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function saveForecastTurnover(amount: number) {
  await prisma.appSetting.upsert({
    where: { key: FORECAST_KEY },
    update: { value: String(amount) },
    create: { key: FORECAST_KEY, value: String(amount) },
  });
}

export async function getRogueDeviationPercent() {
  const row = await prisma.appSetting.findUnique({ where: { key: ROGUE_KEY } });
  const value = Number(row?.value ?? 2);
  return Number.isFinite(value) && value >= 0 ? value : 2;
}

export async function saveRogueDeviationPercent(value: number) {
  await prisma.appSetting.upsert({
    where: { key: ROGUE_KEY },
    update: { value: String(value) },
    create: { key: ROGUE_KEY, value: String(value) },
  });
}

export async function getRogueBranches(month = monthKeyFromDate(), forecast?: number) {
  const threshold = await getRogueDeviationPercent();
  const turnover = forecast ?? (await getForecastTurnover());
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const result: { id: string; name: string; reasons: string[] }[] = [];
  for (const branch of branches) {
    const fill = await getCategoryFill(month, turnover, branch.id);
    const reasons = fill
      .filter((row) => {
        if (row.targetPercent == null || row.actualPercent == null) return false;
        if (row.spent <= 0 && row.actualPercent <= 0) return false;
        return Math.abs(row.actualPercent - row.targetPercent) >= threshold;
      })
      .map((row) => {
        const dir = (row.actualPercent ?? 0) > (row.targetPercent ?? 0) ? "מעל" : "מתחת";
        return `${row.name} ${dir} יעד (${row.actualPercent?.toFixed(1)}% / ${row.targetPercent}%)`;
      });
    if (reasons.length > 0) result.push({ id: branch.id, name: branch.name, reasons });
  }
  return { threshold, branches: result };
}

export async function getCategoryFill(month = monthKeyFromDate(), forecast: number, branchId?: string | null) {
  const { start, end } = monthRangeUtc(month);
  const parents = await prisma.productCategory.findMany({
    where: { parentId: null },
    include: { children: true },
    orderBy: { sortOrder: "asc" },
  });
  const categories = await prisma.productCategory.findMany({
    select: { id: true, parentId: true, accountId: true },
  });

  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      ...(branchId ? { order: { branchId } } : {}),
    },
    include: {
      order: true,
      lines: { include: { orderLine: { include: { product: { include: { category: true } } } } } },
    },
  });

  const spentByParent = new Map<string, number>();
  for (const receipt of receipts) {
    for (const line of receipt.lines) {
      const cat = line.orderLine.product.category;
      const parentId = cat?.parentId ?? cat?.id ?? UNCATEGORIZED_PURCHASE_ID;
      const amount = line.receivedQty * line.invoicePrice;
      spentByParent.set(parentId, (spentByParent.get(parentId) ?? 0) + amount);
    }
  }

  const photos = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      goodsReceiptId: null,
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
    },
    select: {
      amountIls: true,
      aiTotalIls: true,
      accountId: true,
      branchId: true,
      goodsReceiptId: true,
      documentType: true,
    },
  });

  for (const photo of photos) {
    if (!standaloneInvoiceCountsForBranch(photo, branchId)) continue;
    addSignedPurchaseAmount(spentByParent, photo.accountId, photo, categories);
  }

  const rows = parents.map((parent): CategoryFill => {
    const spent = spentByParent.get(parent.id) ?? 0;
    const actualPercent = forecast > 0 ? (spent / forecast) * 100 : null;
    const target = parent.targetPercent;
    const over = actualPercent != null && target != null && actualPercent > target;
    return {
      id: parent.id,
      name: parent.name,
      spent,
      targetPercent: target,
      actualPercent,
      over,
    };
  });
  const uncategorized = spentByParent.get(UNCATEGORIZED_PURCHASE_ID) ?? 0;
  if (uncategorized !== 0) {
    const actualPercent = forecast > 0 ? (uncategorized / forecast) * 100 : null;
    rows.push({
      id: UNCATEGORIZED_PURCHASE_ID,
      name: UNCATEGORIZED_PURCHASE_NAME,
      spent: uncategorized,
      targetPercent: null,
      actualPercent,
      over: false,
    });
  }
  return rows;
}

export type BranchComparisonRow = {
  id: string;
  name: string;
  fill: CategoryFill[];
  purchaseTotal: number;
  purchasePercent: number | null;
  invoiceTotal: number;
  invoiceCount: number;
  orderCount: number;
  orderVolume: number;
};

export async function getNetworkBranchComparison(month = monthKeyFromDate(), forecast?: number) {
  const turnover = forecast ?? (await getForecastTurnover());
  const { start, end } = monthRangeUtc(month);
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const [orders, invoices] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { lines: true },
    }),
    prisma.invoicePhoto.findMany({
      where: {
        ...INVOICE_IN_TOTALS_WHERE,
        accountId: { not: null },
        OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
      },
      include: { goodsReceipt: { include: { order: { select: { branchId: true } } } } },
    }),
  ]);

  const rows: BranchComparisonRow[] = [];
  for (const branch of branches) {
    const fill = await getCategoryFill(month, turnover, branch.id);
    const purchaseTotal = fill.reduce((sum, row) => sum + row.spent, 0);
    const branchInvoices = invoices.filter((photo) => {
      if (!countsTowardInvoiceMetric(photo.documentType)) return false;
      const attributed = photo.branchId ?? photo.goodsReceipt?.order.branchId ?? null;
      return attributed === branch.id;
    });
    const invoiceTotal = branchInvoices.reduce((sum, photo) => sum + signedDocumentAmount(photo), 0);
    const branchOrders = orders.filter((order) => order.branchId === branch.id);
    const orderVolume = branchOrders.reduce(
      (sum, order) =>
        sum + order.lines.reduce((lineSum, line) => lineSum + lineTotal(line.qty, line.unitPrice, line.discountPercent), 0),
      0,
    );
    rows.push({
      id: branch.id,
      name: branch.name,
      fill,
      purchaseTotal,
      purchasePercent: overallPurchasePercent(purchaseTotal, turnover),
      invoiceTotal,
      invoiceCount: branchInvoices.length,
      orderCount: branchOrders.length,
      orderVolume,
    });
  }

  const unattributedInvoices = invoices.filter(
    (photo) => !photo.branchId && !photo.goodsReceipt?.order.branchId,
  ).length;

  return { forecast: turnover, branches: rows, unattributedInvoices };
}

export async function getAnomalies(branchId?: string | null) {
  const pricePending = await prisma.goodsReceipt.findMany({
    where: {
      status: RECEIPT_STATUSES.PENDING_PRICE_APPROVAL,
      ...(branchId ? { order: { branchId } } : {}),
    },
    include: { order: { include: { supplier: true, branch: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const missing = await prisma.goodsReceiptLine.findMany({
    where: {
      missing: true,
      ...(branchId ? { goodsReceipt: { order: { branchId } } } : {}),
    },
    include: {
      orderLine: { include: { product: true } },
      goodsReceipt: { include: { order: { include: { supplier: true } } } },
    },
    take: 20,
  });
  const unclassified = await prisma.invoicePhoto.count({
    where: { accountId: null, isDuplicate: false },
  });
  const exceptional = await prisma.exceptionalItem.findMany({
    where: {
      status: "OPEN",
      ...(branchId ? { branchId } : {}),
    },
    include: { supplier: true, branch: true, order: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return { pricePending, missing, unclassified, exceptional };
}

export type TodayReceiveTask = {
  id: string;
  supplierName: string;
  branchName: string;
  href: string;
  amount: number;
  done: boolean;
};

export type TodayOrderTask = {
  id: string;
  name: string;
  href: string;
  cutoff: string;
  done: boolean;
};

export async function getGoodsToReceiveToday(branchId?: string | null): Promise<TodayReceiveTask[]> {
  const today = nowInIsrael().day;
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.SENT, ORDER_STATUSES.PARTIAL, ORDER_STATUSES.RECEIVED] },
      ...(branchId ? { branchId } : {}),
    },
    include: { supplier: { include: { branchLinks: true } }, branch: true, lines: true, receipt: true },
    orderBy: { createdAt: "asc" },
  });
  const tasks = orders
    .filter((order) => {
      const resolved = resolveSupplierForBranch(order.supplier, order.branchId);
      const days = parseDeliveryDays(resolved.deliveryDays);
      return days.includes(today);
    })
    .map((order) => ({
      id: order.id,
      supplierName: order.supplier.name,
      branchName: order.branch.name,
      href: order.receipt ? `/receipts/${order.receipt.id}` : `/orders/${order.id}/receive`,
      amount: order.lines.reduce((sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent), 0),
      done: Boolean(order.receipt) || order.status === ORDER_STATUSES.RECEIVED,
    }));
  return tasks.sort((a, b) => Number(a.done) - Number(b.done));
}

export async function getOrdersToPlaceToday(
  branchId?: string | null,
  isNetwork = false,
): Promise<TodayOrderTask[]> {
  const suppliers = await prisma.supplier.findMany({
    include: { branchLinks: true },
    orderBy: { name: "asc" },
  });
  const visible = suppliers.filter((supplier) =>
    isNetwork ? supplier.active : supplierVisibleToBranch(supplier, branchId ?? null),
  );
  const openOrders = await prisma.order.findMany({
    where: {
      status: { in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.SENT, ORDER_STATUSES.PARTIAL, ORDER_STATUSES.RECEIVED] },
      ...(branchId ? { branchId } : {}),
    },
    select: { supplierId: true, status: true, createdAt: true },
  });
  const israelToday = nowInIsrael();
  const todayKey = `${israelToday.year}-${String(israelToday.month).padStart(2, "0")}-${String(israelToday.date).padStart(2, "0")}`;
  const latestBySupplier = new Map<string, (typeof openOrders)[number]>();
  for (const order of openOrders) {
    const prev = latestBySupplier.get(order.supplierId);
    if (!prev || order.createdAt > prev.createdAt) latestBySupplier.set(order.supplierId, order);
  }

  const tasks = visible.flatMap((supplier) => {
    const resolved = resolveSupplierForBranch(supplier, branchId ?? null);
    const info = nextDeliveryInfo(
      parseDeliveryDays(resolved.deliveryDays),
      resolved.orderCutoffTime,
      parseWeekdays(resolved.orderDays),
    );
    if (!info.open) return [];
    const latest = latestBySupplier.get(supplier.id);
    const orderedToday =
      latest != null &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(latest.createdAt) === todayKey;
    const done = orderedToday;
    return [
      {
        id: supplier.id,
        name: supplier.name,
        href: `/orders/new?supplierId=${supplier.id}`,
        cutoff: resolved.orderCutoffTime,
        done,
      },
    ];
  });
  return tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name, "he"));
}
