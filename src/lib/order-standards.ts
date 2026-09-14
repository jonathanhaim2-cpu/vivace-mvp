import { parseDeliveryDays, typicalGapDays } from "@/lib/format";
import { monthKeyFromDate, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export function suggestOrderStandard(input: {
  startQty: number;
  orderedQty: number;
  endQty: number;
  wasteQty: number;
  deliveryDays: number[];
  periodDays: number;
  currentStandard: number;
}) {
  const consumption = Math.max(0, input.startQty + input.orderedQty - input.endQty);
  const gap = typicalGapDays(input.deliveryDays);
  const cycles = Math.max(1, input.periodDays / gap);
  const raw = consumption / cycles;
  const suggested = Math.max(0, Math.round(raw * 2) / 2);
  return {
    consumption,
    cycles,
    suggested: suggested > 0 ? suggested : input.currentStandard,
    wasteQty: input.wasteQty,
  };
}

export function inventoryKindLabel(kind: string) {
  switch (kind) {
    case "START":
      return "תחילת חודש";
    case "END":
      return "סוף חודש";
    default:
      return "ספירה נקודתית";
  }
}

function periodDaysBetween(start: Date, end: Date) {
  const ms = Math.max(0, end.getTime() - start.getTime());
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export async function generateOrderStandardSuggestions(endCountId: string) {
  const endCount = await prisma.inventoryCount.findUnique({
    where: { id: endCountId },
    include: {
      lines: { include: { product: { include: { supplier: true } } } },
    },
  });
  if (!endCount) return 0;
  const periodMonth = endCount.periodMonth || monthKeyFromDate(endCount.countedOn);
  const startCount = await prisma.inventoryCount.findFirst({
    where: {
      branchId: endCount.branchId,
      kind: "START",
      periodMonth,
      id: { not: endCount.id },
    },
    include: { lines: true },
    orderBy: { countedOn: "asc" },
  });
  const { start } = monthRangeUtc(periodMonth);
  const rangeStart = startCount?.countedOn ?? start;
  const rangeEnd = endCount.countedOn;
  const days = periodDaysBetween(rangeStart, rangeEnd);

  const orders = await prisma.orderLine.findMany({
    where: {
      order: {
        branchId: endCount.branchId,
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
    },
    include: { receiptLine: true },
  });
  const waste = await prisma.wasteEntry.findMany({
    where: {
      branchId: endCount.branchId,
      occurredOn: { gte: rangeStart, lte: rangeEnd },
      productId: { not: null },
    },
  });

  const orderedByProduct = new Map<string, number>();
  for (const line of orders) {
    const qty = line.receiptLine?.receivedQty ?? line.qty;
    orderedByProduct.set(line.productId, (orderedByProduct.get(line.productId) ?? 0) + qty);
  }
  const wasteByProduct = new Map<string, number>();
  for (const entry of waste) {
    if (!entry.productId) continue;
    wasteByProduct.set(entry.productId, (wasteByProduct.get(entry.productId) ?? 0) + entry.qty);
  }
  const startByProduct = new Map((startCount?.lines ?? []).map((line) => [line.productId, line.countedQty]));

  let upserts = 0;
  for (const line of endCount.lines) {
    const startQty = startByProduct.get(line.productId) ?? 0;
    const orderedQty = orderedByProduct.get(line.productId) ?? 0;
    const wasteQty = wasteByProduct.get(line.productId) ?? 0;
    const result = suggestOrderStandard({
      startQty,
      orderedQty,
      endQty: line.countedQty,
      wasteQty,
      deliveryDays: parseDeliveryDays(line.product.supplier.deliveryDays),
      periodDays: days,
      currentStandard: line.product.stockStandard,
    });
    await prisma.orderStandardSuggestion.upsert({
      where: {
        branchId_productId_periodMonth: {
          branchId: endCount.branchId,
          productId: line.productId,
          periodMonth,
        },
      },
      create: {
        branchId: endCount.branchId,
        productId: line.productId,
        periodMonth,
        startCountId: startCount?.id ?? null,
        endCountId: endCount.id,
        startQty,
        orderedQty,
        endQty: line.countedQty,
        wasteQty,
        consumptionQty: result.consumption,
        suggestedStandard: result.suggested,
        currentStandard: line.product.stockStandard,
        status: "PENDING",
      },
      update: {
        startCountId: startCount?.id ?? null,
        endCountId: endCount.id,
        startQty,
        orderedQty,
        endQty: line.countedQty,
        wasteQty,
        consumptionQty: result.consumption,
        suggestedStandard: result.suggested,
        currentStandard: line.product.stockStandard,
        status: "PENDING",
      },
    });
    upserts += 1;
  }
  return upserts;
}
