import { parsePhotoDocumentType } from "@/lib/constants";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";

export function isInvoiceImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isInvoicePdf(mimeType: string, originalName = "") {
  return mimeType === "application/pdf" || originalName.toLowerCase().endsWith(".pdf");
}

/** Normalize invoice dates from the date input or AI strings to YYYY-MM-DD when possible. */
export function parseInvoiceDateInput(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return value;
}

export function toDateInputValue(raw: string | null | undefined): string {
  const parsed = parseInvoiceDateInput(raw);
  return parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : "";
}

export function parseAmountIls(raw: string | null | undefined): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const normalized = value.includes(".") ? value.replace(/,/g, "") : value.replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function invoiceClassificationFromForm(formData: FormData) {
  const invoiceDate = parseInvoiceDateInput(String(formData.get("invoiceDate") ?? ""));
  const supplierName = String(formData.get("supplierName") ?? "").trim() || null;
  const amountIls = parseAmountIls(String(formData.get("amountIls") ?? ""));
  const note = String(formData.get("note") ?? formData.get("voiceNoteText") ?? "").trim() || null;
  const accountId = String(formData.get("accountId") ?? "").trim();
  const branchId = String(formData.get("branchId") ?? "").trim() || null;
  const periodMonth =
    resolvedPeriodMonth(String(formData.get("periodMonth") ?? ""), invoiceDate) ?? monthKeyFromDate();
  const documentType = parsePhotoDocumentType(formData.get("documentType"));
  return { invoiceDate, supplierName, amountIls, note, accountId, periodMonth, branchId, documentType };
}
