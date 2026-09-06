export const COMPANY = {
  name: "Vivac'e",
  nameHe: "ויואצ'ה",
  taxId: "204754121",
  owner: "רועי",
  productOwner: "יונתן",
  accountantEmail: "accountant@vivace.example",
} as const;

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
