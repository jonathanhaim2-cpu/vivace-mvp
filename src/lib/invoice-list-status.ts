import { INVOICE_APPROVAL } from "@/lib/invoice-approval";

export const INVOICE_LIST_STATUS = {
  CLASSIFIED: "classified",
  AWAITING_APPROVAL: "awaiting_approval",
  PENDING_CLASSIFICATION: "pending_classification",
  MISSING_BRANCH: "missing_branch",
} as const;

export type InvoiceListStatus = (typeof INVOICE_LIST_STATUS)[keyof typeof INVOICE_LIST_STATUS];

export const INVOICE_LIST_STATUS_META: Record<InvoiceListStatus, { label: string; tone: "green" | "amber" | "red" }> = {
  classified: { label: "משובץ", tone: "green" },
  awaiting_approval: { label: "ממתין לאישור", tone: "amber" },
  pending_classification: { label: "ממתין לסיווג", tone: "amber" },
  missing_branch: { label: "חסר סניף", tone: "red" },
};

export type InvoiceStatusInput = {
  accountId?: string | null;
  branchId?: string | null;
  approvalStatus?: string | null;
  /** Explicit HQ/network expense. Null branch is intentional, not «חסר סניף». */
  aiNetworkExpense?: boolean | null;
};

/**
 * Null/empty branch is «חסר סניף».
 * `aiNetworkExpense` marks an intentional network expense that stores no branch id.
 */
export function isMissingInvoiceBranch(photo: InvoiceStatusInput) {
  if (photo.aiNetworkExpense) return false;
  return !photo.branchId;
}

/**
 * One pill per row.
 * Approval (the home «ממתינות לאישור» field) wins, then a missing branch, then unclassified, else assigned.
 */
export function deriveInvoiceListStatus(photo: InvoiceStatusInput): InvoiceListStatus {
  if (photo.approvalStatus === INVOICE_APPROVAL.PENDING) return INVOICE_LIST_STATUS.AWAITING_APPROVAL;
  if (isMissingInvoiceBranch(photo)) return INVOICE_LIST_STATUS.MISSING_BRANCH;
  if (!photo.accountId) return INVOICE_LIST_STATUS.PENDING_CLASSIFICATION;
  return INVOICE_LIST_STATUS.CLASSIFIED;
}

/** Banner queue: mail approval or not yet classified. A classified invoice that only lacks a branch stays out. */
export function isAwaitingTreatment(photo: InvoiceStatusInput) {
  return photo.approvalStatus === INVOICE_APPROVAL.PENDING || !photo.accountId;
}

export function invoiceDocumentNumber(originalName: string | null | undefined) {
  const base = (originalName ?? "").replace(/\.[^.]+$/, "").trim();
  return base || "—";
}

export function shortInvoiceDate(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}`;
}

export function invoiceDateDisplay(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function shiftDateKey(dateKey: string, days: number) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function invoiceGroupLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return "היום";
  if (dateKey === shiftDateKey(todayKey, -1)) return "אתמול";
  return shortInvoiceDate(dateKey);
}
