import { PAYMENT_METHODS } from "@/lib/constants";
import { getSupplierApRows, payMethodLabel } from "@/lib/ap";
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

function clampChargeDay(day: number | null | undefined) {
  if (day == null || !Number.isFinite(day)) return 15;
  return Math.min(28, Math.max(1, Math.round(day)));
}

function dateKeyFor(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export async function getCashflow(month = monthKeyFromDate()) {
  const [apRows, recurring] = await Promise.all([
    getSupplierApRows(month),
    prisma.recurringLine.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const entries: CashflowEntry[] = [];

  for (const row of apRows) {
    const method = row.ap?.payMethod ?? row.supplier.paymentMethod ?? null;
    const day = clampChargeDay(row.supplier.paymentChargeDay ?? (method?.startsWith("CARD") ? 15 : 1));
    if (row.purchased === 0 && !row.ap?.approvedForPayment) continue;
    entries.push({
      id: `sup-${row.supplier.id}`,
      dateKey: dateKeyFor(month, day),
      day,
      name: row.supplier.name,
      kind: "supplier",
      paymentMethod: method,
      paymentLabel: payMethodLabel(method),
      amountIls: row.amountDue,
      note: row.ap?.approvedForPayment ? "אושר לתשלום" : "רכש לחודש",
    });
  }

  for (const line of recurring) {
    if (line.kind !== "EXPENSE") continue;
    const day = clampChargeDay(line.chargeDay);
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
  return { month, entries, days, total };
}
