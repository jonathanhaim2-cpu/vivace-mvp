import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { isInHouseDocument, signedDocumentAmount } from "@/lib/money";
import { monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export type DeliveryNoteReconcileRow = {
  supplierName: string;
  branchName: string | null;
  deliveryNotes: { id: string; originalName: string; amountIls: number }[];
  invoices: { id: string; originalName: string; amountIls: number }[];
  credits: { id: string; title: string; amountIls: number }[];
  deliveryTotal: number;
  invoiceTotal: number;
  creditTotal: number;
  matched: boolean;
};

export async function getDeliveryNoteReconcile(month: string): Promise<DeliveryNoteReconcileRow[]> {
  const { start, end } = monthRangeUtc(month);
  const photos = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
    },
    include: {
      branch: true,
      goodsReceipt: { include: { order: { include: { supplier: true, branch: true } } } },
    },
  });
  const credits = await prisma.exceptionalItem.findMany({
    where: {
      kind: "CREDIT_REQUEST",
      createdAt: { gte: start, lt: end },
    },
    include: { supplier: true, branch: true },
  });

  const groups = new Map<string, DeliveryNoteReconcileRow>();
  function bucket(supplierName: string, branchName: string | null) {
    const key = `${supplierName}::${branchName ?? ""}`;
    const current = groups.get(key) ?? {
      supplierName,
      branchName,
      deliveryNotes: [],
      invoices: [],
      credits: [],
      deliveryTotal: 0,
      invoiceTotal: 0,
      creditTotal: 0,
      matched: false,
    };
    groups.set(key, current);
    return current;
  }

  for (const photo of photos) {
    const supplierName = photo.goodsReceipt?.order.supplier.name ?? photo.aiSupplierName?.trim() ?? "ספק לא מזוהה";
    const branchName = photo.branch?.name ?? photo.goodsReceipt?.order.branch.name ?? null;
    const row = bucket(supplierName, branchName);
    const amount = signedDocumentAmount(photo);
    if (isInHouseDocument(photo.documentType)) {
      row.deliveryNotes.push({ id: photo.id, originalName: photo.originalName, amountIls: amount });
      row.deliveryTotal += amount;
    } else if (photo.documentType === "INVOICE" || photo.documentType === "CREDIT_NOTE") {
      row.invoices.push({ id: photo.id, originalName: photo.originalName, amountIls: amount });
      row.invoiceTotal += amount;
    }
  }

  for (const item of credits) {
    const row = bucket(item.supplier.name, item.branch.name);
    row.credits.push({ id: item.id, title: item.title, amountIls: item.amountIls });
    row.creditTotal += item.amountIls;
  }

  return [...groups.values()]
    .filter((row) => row.deliveryNotes.length > 0 || row.credits.length > 0)
    .map((row) => ({
      ...row,
      matched: Math.abs(row.deliveryTotal + row.creditTotal - row.invoiceTotal) < 1,
    }))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName, "he"));
}
