import { PAYMENT_METHODS } from "@/lib/constants";
import { INVOICE_IN_TOTALS_WHERE } from "@/lib/invoice-duplicates";
import { monthKeyFromDate, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { nowInIsrael } from "@/lib/format";
import { isStatementDocument, signedDocumentAmount } from "@/lib/money";

export function payMethodLabel(value: string | null | undefined) {
  return PAYMENT_METHODS.find((item) => item.value === value)?.label ?? value ?? "—";
}

export async function getSupplierApRows(month = monthKeyFromDate()) {
  const { start, end } = monthRangeUtc(month);
  const suppliers = await prisma.supplier.findMany({
    include: {
      apMonths: { where: { month } },
      orders: {
        where: { createdAt: { gte: start, lt: end } },
        include: { receipt: { include: { lines: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const standalone = await prisma.invoicePhoto.findMany({
    where: {
      ...INVOICE_IN_TOTALS_WHERE,
      goodsReceiptId: null,
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
    },
    select: {
      aiSupplierName: true,
      documentType: true,
      amountIls: true,
      aiTotalIls: true,
    },
  });

  const extraBySupplierName = new Map<string, number>();
  const statementsBySupplierName = new Map<string, number>();
  for (const photo of standalone) {
    const name = (photo.aiSupplierName ?? "").trim();
    if (!name) continue;
    const amount = signedDocumentAmount(photo);
    if (isStatementDocument(photo.documentType)) {
      statementsBySupplierName.set(name, (statementsBySupplierName.get(name) ?? 0) + amount);
      continue;
    }
    extraBySupplierName.set(name, (extraBySupplierName.get(name) ?? 0) + amount);
  }

  return suppliers
    .map((supplier) => {
      const fromReceipts = supplier.orders.reduce((sum, order) => {
        if (!order.receipt) return sum;
        return sum + order.receipt.lines.reduce((lineSum, line) => lineSum + line.receivedQty * line.invoicePrice, 0);
      }, 0);
      const extra = extraBySupplierName.get(supplier.name) ?? 0;
      const statements = statementsBySupplierName.get(supplier.name) ?? 0;
      const purchased = fromReceipts + extra;
      const ap = supplier.apMonths[0] ?? null;
      const storedDue = ap?.amountDue;
      return {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          accountingEmail: supplier.accountingEmail,
          paymentMethod: supplier.paymentMethod,
          paymentChargeDay: supplier.paymentChargeDay,
          card1Label: supplier.card1Label,
          card2Label: supplier.card2Label,
        },
        amountDue: storedDue != null && Number.isFinite(storedDue) ? storedDue : purchased,
        purchased,
        statements,
        ap,
      };
    })
    .filter((row) => row.purchased !== 0 || row.statements !== 0 || row.ap);
}

export async function getNonProcurementChecklist(month = monthKeyFromDate()) {
  return prisma.invoicePhoto.findMany({
    where: {
      periodMonth: month,
      ...INVOICE_IN_TOTALS_WHERE,
      OR: [{ source: "MANUAL" }, { documentType: "STATEMENT" }],
    },
    include: { account: { include: { parent: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOverdueAccountantItems(month = monthKeyFromDate()) {
  const today = nowInIsrael();
  if (today.date < 10) return [];
  const items = await getNonProcurementChecklist(month);
  return items.filter((item) => !item.paid || !item.sentToAccountant);
}
