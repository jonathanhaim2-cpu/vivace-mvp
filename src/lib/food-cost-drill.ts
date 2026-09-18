import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { countsTowardPurchase, signedDocumentAmount } from "@/lib/money";
import { monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { publicFileUrl } from "@/lib/uploads";

export const FOOD_PARENT_ID = "acc_food";

const FOOD_ACCOUNTS = new Set([
  "acc_food_produce",
  "acc_food_dough",
  "acc_food_dairy",
  "acc_food_pasta",
  "acc_food_dry",
  "acc_food_dessert",
  "acc_food_misc",
  "acc_food_drinks",
  "acc_food_packaging",
]);

export function isFoodAccount(accountId: string | null | undefined) {
  return Boolean(accountId && FOOD_ACCOUNTS.has(accountId));
}

export type FoodCostSupplierRow = {
  key: string;
  name: string;
  supplierId: string | null;
  amountIls: number;
  documents: number;
};

export type FoodCostInvoiceRow = {
  id: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  amountIls: number;
  accountId: string | null;
  periodMonth: string | null;
  orderId: string | null;
  receiptId: string | null;
  branchName: string | null;
};

export async function getFoodCostSuppliers(month: string, branchId?: string | null): Promise<FoodCostSupplierRow[]> {
  const { start, end } = monthRangeUtc(month);
  const photos = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      AND: [
        { OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }] },
        ...(branchId
          ? [{ OR: [{ branchId }, { goodsReceipt: { order: { branchId } } }] }]
          : []),
      ],
    },
    include: {
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
    },
  });

  const byKey = new Map<string, FoodCostSupplierRow>();
  for (const photo of photos) {
    if (!isFoodAccount(photo.accountId) && !photo.goodsReceipt) continue;
    if (photo.accountId && !isFoodAccount(photo.accountId)) continue;
    if (!countsTowardPurchase(photo.documentType) && !photo.goodsReceiptId) continue;
    const supplier = photo.goodsReceipt?.order.supplier;
    const name = supplier?.name ?? photo.aiSupplierName?.trim() ?? "ספק לא מזוהה";
    const key = supplier?.id ?? name;
    const current = byKey.get(key) ?? {
      key,
      name,
      supplierId: supplier?.id ?? null,
      amountIls: 0,
      documents: 0,
    };
    current.amountIls += signedDocumentAmount(photo);
    current.documents += 1;
    byKey.set(key, current);
  }
  return [...byKey.values()].sort((a, b) => Math.abs(b.amountIls) - Math.abs(a.amountIls));
}

export async function getFoodCostInvoices(
  month: string,
  supplierKey: string,
  branchId?: string | null,
): Promise<FoodCostInvoiceRow[]> {
  const suppliers = await getFoodCostSuppliers(month, branchId);
  const match = suppliers.find((row) => row.key === supplierKey);
  if (!match) return [];
  const { start, end } = monthRangeUtc(month);
  const photos = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
    },
    include: {
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return photos
    .filter((photo) => {
      const supplier = photo.goodsReceipt?.order.supplier;
      const name = supplier?.name ?? photo.aiSupplierName?.trim() ?? "ספק לא מזוהה";
      const key = supplier?.id ?? name;
      if (key !== supplierKey) return false;
      if (photo.accountId && !isFoodAccount(photo.accountId) && !photo.goodsReceiptId) return false;
      return true;
    })
    .map((photo) => ({
      id: photo.id,
      originalName: photo.originalName,
      fileUrl: publicFileUrl(photo.fileName),
      mimeType: photo.mimeType,
      amountIls: signedDocumentAmount(photo),
      accountId: photo.accountId,
      periodMonth: photo.periodMonth,
      orderId: photo.goodsReceipt?.orderId ?? null,
      receiptId: photo.goodsReceiptId,
      branchName: photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? null,
    }));
}
