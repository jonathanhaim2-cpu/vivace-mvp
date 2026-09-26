import { monthKeyFromDate, monthKeyFromInvoiceDate } from "@/lib/months";

/**
 * Month a document belongs to on the P&L.
 * Invoice date wins. If it is missing, use the document/delivery date, then the
 * created timestamp. A stored periodMonth override is intentionally ignored —
 * that override was pinning every invoice to the upload month (September).
 */
export function pnlMonthKey(input: {
  invoiceDate?: string | null;
  documentDate?: string | null;
  createdAt?: Date | string | null;
}): string | null {
  const invoice = monthKeyFromInvoiceDate(input.invoiceDate);
  if (invoice) return invoice;
  const document = monthKeyFromInvoiceDate(input.documentDate);
  if (document) return document;
  if (input.createdAt == null || input.createdAt === "") return null;
  const created = input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return monthKeyFromDate(created);
}

/** `period` is YYYY-MM (one month), YYYY (that year), or empty (every month). */
export function invoiceInPnlPeriod(monthKey: string | null, period?: string | null): boolean {
  const key = period?.trim() ?? "";
  if (!key) return true;
  if (!monthKey) return false;
  if (/^\d{4}$/.test(key)) return monthKey.startsWith(`${key}-`);
  return monthKey === key;
}
