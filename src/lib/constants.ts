export const COMPANY = {
  name: "Vivac'e",
  wordmark: "Vivac'e",
  nameHe: "ויואצ'ה",
  tagline: "Famiglia & Pizza",
  website: "https://vivace-pizza.com",
  taxId: "204754121",
  owner: "רועי",
  productOwner: "יונתן",
  accountantEmail: "accountant@vivace.example",
  phone: "0526408537",
} as const;

/** Roi's mobile — WhatsApp target while «שליחה לספקים» is off (test mode). */
export const ROI_WHATSAPP_PHONE = "0526408537";

export const WEEKDAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "TAX_INVOICE", label: "חשבונית מס" },
  { value: "DELIVERY_NOTE", label: "תעודת משלוח" },
  { value: "MIX_PER_PRODUCT", label: "משולב לפי מוצר" },
] as const;

export const ORDER_STATUSES = {
  CONFIRMED: "CONFIRMED",
  SENT: "SENT",
  PARTIAL: "PARTIAL",
  RECEIVED: "RECEIVED",
} as const;

export const RECEIPT_STATUSES = {
  SUBMITTED: "SUBMITTED",
  PENDING_PRICE_APPROVAL: "PENDING_PRICE_APPROVAL",
  APPROVED: "APPROVED",
  CREDIT_NEEDED: "CREDIT_NEEDED",
} as const;

export const PRICE_CHANGE = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type Role = "network" | "branch";

export const PRICE_LIST_KIND = {
  FRANCHISEE: "FRANCHISEE",
  NETWORK: "NETWORK",
} as const;

export const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "העברה בנקאית" },
  { value: "CARD", label: "כרטיס אשראי" },
  { value: "CHECK", label: "שיק" },
  { value: "CASH", label: "מזומן" },
] as const;

export const PAYMENT_TERMS = [
  { value: "IMMEDIATE", label: "שוטף + 0" },
  { value: "NET15", label: "שוטף + 15" },
  { value: "NET30", label: "שוטף + 30" },
  { value: "NET45", label: "שוטף + 45" },
  { value: "NET60", label: "שוטף + 60" },
  { value: "CASH", label: "מזומן בעסקה" },
] as const;

export const VAT_RATE = 0.18;

export const INVENTORY_KIND = {
  START: "START",
  END: "END",
  SPOT: "SPOT",
} as const;

export const STANDARD_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const WHATSAPP_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
} as const;

export const BILLED_AS = {
  FULL_ORDERED: "FULL_ORDERED",
  RECEIVED_ONLY: "RECEIVED_ONLY",
} as const;

export const EXCEPTION_KIND = {
  CREDIT_REQUEST: "CREDIT_REQUEST",
  MISSING_NO_CREDIT: "MISSING_NO_CREDIT",
  ON_THE_WAY: "ON_THE_WAY",
} as const;

export const EXCEPTION_STATUS = {
  OPEN: "OPEN",
  CONFIRMED: "CONFIRMED",
  ARRIVED: "ARRIVED",
  CANCELLED: "CANCELLED",
} as const;

/** InvoicePhoto.duplicateStatus — suspected copies are stored but excluded from totals. */
export const INVOICE_DUPLICATE_STATUS = {
  DUPLICATE: "DUPLICATE",
  CONFIRMED_UNIQUE: "CONFIRMED_UNIQUE",
} as const;
