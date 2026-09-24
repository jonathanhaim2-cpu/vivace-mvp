import { getSupplierApRows, payMethodLabel } from "@/lib/ap";
import { chargeDayFor, projectBalance } from "@/lib/cashflow-view";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export type CashflowEntry = {
  id: string;
  dateKey: string;
  day: number;
  name: string;
  kind: "supplier" | "fixed" | "variable";
  paymentMethod: string | null;
  paymentLabel: string;
  amountIls: number;
  note: string | null;
};

function dateKeyFor(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export async function getCashflow(month = monthKeyFromDate()) {
  const [apRows, recurring, cards, openingRow] = await Promise.all([
    getSupplierApRows(month),
    prisma.recurringLine.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.paymentCard.findMany({ where: { active: true }, include: { links: true } }),
    prisma.appSetting.findUnique({ where: { key: "cashflow.openingBalance" } }),
  ]);
  const openingBalance = Number(openingRow?.value ?? 0) || 0;

  const entries: CashflowEntry[] = [];

  for (const row of apRows) {
    const method = row.ap?.payMethod ?? row.supplier.paymentMethod ?? null;
    const card = cards.find((item) => item.links.some((link) => link.supplierId === row.supplier.id));
    const day = chargeDayFor({
      paymentChargeDay: row.supplier.paymentChargeDay,
      paymentMethod: method,
      cardBillingDay: card?.billingDay,
    });
    if (row.purchased === 0 && !row.ap?.approvedForPayment) continue;
    entries.push({
      id: `sup-${row.supplier.id}`,
      dateKey: dateKeyFor(month, day),
      day,
      name: row.supplier.name,
      kind: "supplier",
      paymentMethod: method,
      paymentLabel: card ? `${card.name} ···· ${card.last4}` : payMethodLabel(method),
      amountIls: row.amountDue,
      note: row.ap?.approvedForPayment ? "אושר לתשלום" : "רכש לחודש",
    });
  }

  for (const line of recurring) {
    if (line.kind !== "EXPENSE") continue;
    const card = cards.find((item) => item.links.some((link) => link.accountId && link.accountId === line.accountId));
    const day = chargeDayFor({
      paymentChargeDay: line.chargeDay,
      paymentMethod: line.paymentMethod,
      cardBillingDay: card?.billingDay,
    });
    entries.push({
      id: `rec-${line.id}`,
      dateKey: dateKeyFor(month, day),
      day,
      name: line.name,
      kind: line.cadence === "FIXED" ? "fixed" : "variable",
      paymentMethod: line.paymentMethod,
      paymentLabel: payMethodLabel(line.paymentMethod),
      amountIls: line.amountIls,
      note: line.notes,
    });
  }

  entries.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, "he"));
  const byDay = new Map<number, { day: number; dateKey: string; amountIls: number; items: CashflowEntry[] }>();
  for (const entry of entries) {
    const bucket = byDay.get(entry.day) ?? { day: entry.day, dateKey: entry.dateKey, amountIls: 0, items: [] };
    bucket.amountIls += entry.amountIls;
    bucket.items.push(entry);
    byDay.set(entry.day, bucket);
  }

  const days = [...byDay.values()].sort((a, b) => a.day - b.day);
  const total = entries.reduce((sum, entry) => sum + entry.amountIls, 0);
  const projection = projectBalance(
    openingBalance,
    days.map((bucket) => ({ day: bucket.day, amountIls: bucket.amountIls })),
  );
  return { month, entries, days, total, openingBalance, projection };
}
