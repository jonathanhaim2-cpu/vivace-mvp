import { PAYMENT_METHODS } from "@/lib/constants";
import { monthKeyFromDate, monthRangeUtc } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { nowInIsrael } from "@/lib/format";

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

  return suppliers.map((supplier) => {
    const amountDue = supplier.orders.reduce((sum, order) => {
      if (!order.receipt) return sum;
      return sum + order.receipt.lines.reduce((lineSum, line) => lineSum + line.receivedQty * line.invoicePrice, 0);
    }, 0);
    const ap = supplier.apMonths[0] ?? null;
    return {
      supplier: { id: supplier.id, name: supplier.name, accountingEmail: supplier.accountingEmail, paymentMethod: supplier.paymentMethod },
      amountDue: ap?.amountDue && ap.amountDue > 0 ? ap.amountDue : amountDue,
      purchased: amountDue,
      ap,
    };
  }).filter((row) => row.purchased > 0 || row.ap);
}

export async function getNonProcurementChecklist(month = monthKeyFromDate()) {
  return prisma.invoicePhoto.findMany({
    where: {
      source: "MANUAL",
      periodMonth: month,
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
