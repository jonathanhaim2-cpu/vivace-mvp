import { PHOTO_DOCUMENT_TYPE, parsePhotoDocumentType, VAT_RATE } from "@/lib/constants";

export function isCreditDocument(documentType: string | null | undefined) {
  return parsePhotoDocumentType(documentType) === PHOTO_DOCUMENT_TYPE.CREDIT_NOTE;
}

/** Delivery notes stay in-house — not in accountant package or purchase %. */
export function isInHouseDocument(documentType: string | null | undefined) {
  return parsePhotoDocumentType(documentType) === PHOTO_DOCUMENT_TYPE.DELIVERY_NOTE;
}

/** גילול / כרטסת — AP statement, not an invoice. */
export function isStatementDocument(documentType: string | null | undefined) {
  return parsePhotoDocumentType(documentType) === PHOTO_DOCUMENT_TYPE.STATEMENT;
}

export function countsTowardPurchase(documentType: string | null | undefined) {
  const type = parsePhotoDocumentType(documentType);
  return (
    type === PHOTO_DOCUMENT_TYPE.INVOICE ||
    type === PHOTO_DOCUMENT_TYPE.CREDIT_NOTE ||
    type === PHOTO_DOCUMENT_TYPE.RECEIPT ||
    type === PHOTO_DOCUMENT_TYPE.UNKNOWN
  );
}

export function countsTowardInvoiceMetric(documentType: string | null | undefined) {
  const type = parsePhotoDocumentType(documentType);
  return type === PHOTO_DOCUMENT_TYPE.INVOICE || type === PHOTO_DOCUMENT_TYPE.CREDIT_NOTE;
}

export function includeInAccountantPackage(documentType: string | null | undefined) {
  const type = parsePhotoDocumentType(documentType);
  return (
    type === PHOTO_DOCUMENT_TYPE.INVOICE ||
    type === PHOTO_DOCUMENT_TYPE.CREDIT_NOTE ||
    type === PHOTO_DOCUMENT_TYPE.RECEIPT ||
    type === PHOTO_DOCUMENT_TYPE.UNKNOWN
  );
}

/**
 * Credit notes reduce spend. A stored positive magnitude (legacy rows) is negated;
 * an already-negative entry is kept.
 */
export function signedDocumentAmount(input: {
  documentType?: string | null;
  amountIls?: number | null;
  aiTotalIls?: number | null;
}) {
  const raw = input.amountIls ?? input.aiTotalIls;
  if (raw == null || !Number.isFinite(raw)) return 0;
  if (isCreditDocument(input.documentType) && raw > 0) return -Math.abs(raw);
  return raw;
}

export function normalizeCreditEntryAmount(documentType: string | null | undefined, amount: number | null) {
  if (amount == null || !Number.isFinite(amount)) return amount;
  if (isCreditDocument(documentType) && amount > 0) return -Math.abs(amount);
  return amount;
}

export function splitVat(amount: number, vatIncluded: boolean, rate = VAT_RATE) {
  if (!Number.isFinite(amount)) {
    return { amountExVat: 0, vatAmount: 0, amountInclVat: 0 };
  }
  if (vatIncluded) {
    const ex = amount / (1 + rate);
    return { amountExVat: ex, vatAmount: amount - ex, amountInclVat: amount };
  }
  return {
    amountExVat: amount,
    vatAmount: amount * rate,
    amountInclVat: amount * (1 + rate),
  };
}

export function parsePaidFlag(value: FormDataEntryValue | null | undefined): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "on" || raw === "true" || raw === "1" || raw === "yes" || raw === "paid" || raw === "שולם";
}

export function parseVatIncludedFlag(value: FormDataEntryValue | null | undefined, fallback = true) {
  if (value == null || String(value).trim() === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (raw === "ex" || raw === "false" || raw === "0" || raw === "off") return false;
  return raw === "on" || raw === "true" || raw === "1" || raw === "incl" || raw === "included";
}

/** When marking unpaid, never keep a zeroed total if we still have the original/AI amount. */
export function restoreUnpaidAmount(input: {
  amountIls?: number | null;
  originalAmountIls?: number | null;
  aiTotalIls?: number | null;
}) {
  if (input.amountIls != null && Number.isFinite(input.amountIls) && input.amountIls !== 0) {
    return input.amountIls;
  }
  if (input.originalAmountIls != null && Number.isFinite(input.originalAmountIls) && input.originalAmountIls !== 0) {
    return input.originalAmountIls;
  }
  if (input.aiTotalIls != null && Number.isFinite(input.aiTotalIls) && input.aiTotalIls !== 0) {
    return input.aiTotalIls;
  }
  return input.amountIls ?? input.originalAmountIls ?? input.aiTotalIls ?? null;
}

export function snapshotOriginalAmount(current: number | null | undefined, existingOriginal: number | null | undefined) {
  if (existingOriginal != null && Number.isFinite(existingOriginal) && existingOriginal !== 0) {
    return existingOriginal;
  }
  return current ?? null;
}
