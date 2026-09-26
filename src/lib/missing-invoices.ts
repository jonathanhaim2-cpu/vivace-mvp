/** Days after the charge day before a fixed expense with no invoice becomes an exception. */
export const FIXED_INVOICE_GRACE_DAYS = 3;

export type CivilDate = { year: number; month: number; date: number };

export function isFixedExpenseMissing(input: {
  chargeDay: number | null | undefined;
  today: CivilDate;
  matchedInvoiceCountThisMonth: number;
  active?: boolean;
}): boolean {
  if (input.active === false) return false;
  if (input.matchedInvoiceCountThisMonth > 0) return false;
  const day = input.chargeDay;
  if (day == null || !Number.isFinite(day) || day < 1) return false;
  const due = Math.min(28, Math.round(day)) + FIXED_INVOICE_GRACE_DAYS;
  return input.today.date > due;
}

export function fixedExpenseMessage(name: string) {
  return `הייתה צריכה להיכנס חשבונית ${name} ולא נכנסה`;
}

/** Expected invoices this month: manual override, otherwise the mean of the last 3 full months. */
export function expectedInvoicesPerMonth(input: {
  countsLast3FullMonths: number[];
  manualOverride?: number | null;
}): number {
  if (input.manualOverride != null && Number.isFinite(input.manualOverride) && input.manualOverride >= 0) {
    return input.manualOverride;
  }
  const counts = input.countsLast3FullMonths.slice(0, 3);
  if (counts.length === 0) return 0;
  const sum = counts.reduce((total, count) => total + (Number.isFinite(count) ? count : 0), 0);
  return sum / counts.length;
}

/** Fewer invoices than expected (including none) is a red exception. Zero expected never alerts. */
export function isInvoiceCountShort(arrivedThisMonth: number, expected: number) {
  if (!(expected > 0)) return false;
  return arrivedThisMonth + 0.0001 < expected;
}

export function missingSupplierInvoicesMessage(name: string, arrived: number, expected: number) {
  const expectedLabel = Number.isInteger(expected) ? String(expected) : expected.toFixed(1);
  return `חסרות חשבוניות · ${name} · הגיעו ${arrived} מתוך ${expectedLabel} הצפויות`;
}

export function previousFullMonthKeys(today: CivilDate, count = 3): string[] {
  const keys: string[] = [];
  let year = today.year;
  let month = today.month;
  for (let i = 0; i < count; i += 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return keys;
}

export function monthKeyOf(today: CivilDate) {
  return `${today.year}-${String(today.month).padStart(2, "0")}`;
}
