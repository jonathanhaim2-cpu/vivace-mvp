import { nowInIsrael, nextDeliveryInfo, parseDeliveryDays } from "@/lib/format";
import { monthKeyFromDate, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { RECEIPT_STATUSES } from "@/lib/constants";
import { supplierVisibleToBranch } from "@/lib/catalog";

const FORECAST_KEY = "dashboard.forecastTurnoverIls";

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
  const value = Number(row?.value ?? 200000);
  return Number.isFinite(value) && value > 0 ? value : 200000;
}

export async function saveForecastTurnover(amount: number) {
  await prisma.appSetting.upsert({
    where: { key: FORECAST_KEY },
    update: { value: String(amount) },
    create: { key: FORECAST_KEY, value: String(amount) },
  });
}

export async function getCategoryFill(month = monthKeyFromDate(), forecast: number, branchId?: string | null) {
  const { start, end } = monthRangeUtc(month);
  const parents = await prisma.productCategory.findMany({
    where: { parentId: null },
    include: { children: true },
    orderBy: { sortOrder: "asc" },
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
      const parentId = cat?.parentId ?? cat?.id;
      if (!parentId) continue;
      const amount = line.receivedQty * line.invoicePrice;
      spentByParent.set(parentId, (spentByParent.get(parentId) ?? 0) + amount);
    }
  }

  return parents.map((parent): CategoryFill => {
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
    where: { accountId: null },
  });
  return { pricePending, missing, unclassified };
}

export async function getGoodsToReceiveToday(branchId?: string | null) {
  const today = nowInIsrael().day;
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["CONFIRMED", "SENT"] },
      ...(branchId ? { branchId } : {}),
    },
    include: { supplier: true, branch: true, lines: true },
    orderBy: { createdAt: "asc" },
  });
  return orders.filter((order) => {
    const days = parseDeliveryDays(order.supplier.deliveryDays);
    return days.includes(today);
  });
}

export async function getOrdersToPlaceToday(branchId?: string | null, isNetwork = false) {
  const suppliers = await prisma.supplier.findMany({
    include: { branchLinks: true },
    orderBy: { name: "asc" },
  });
  const visible = suppliers.filter((supplier) =>
    isNetwork ? supplier.active : supplierVisibleToBranch(supplier, branchId ?? null),
  );
  const openIds = new Set(
    (
      await prisma.order.findMany({
        where: {
          status: { in: ["CONFIRMED", "SENT"] },
          ...(branchId ? { branchId } : {}),
        },
        select: { supplierId: true },
      })
    ).map((o) => o.supplierId),
  );
  return visible.filter((supplier) => {
    const info = nextDeliveryInfo(parseDeliveryDays(supplier.deliveryDays), supplier.orderCutoffTime);
    return info.open && !openIds.has(supplier.id);
  });
}
