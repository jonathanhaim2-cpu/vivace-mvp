import { BILLED_AS, EXCEPTION_KIND, EXCEPTION_STATUS } from "@/lib/constants";
import { formatIls } from "@/lib/format";

export function qtyDiffers(orderedQty: number, receivedQty: number) {
  return Math.abs(orderedQty - receivedQty) > 0.009;
}

export function isShortage(orderedQty: number, receivedQty: number, missing = false) {
  return missing || receivedQty + 0.009 < orderedQty;
}

export function creditAmountIls(
  orderedQty: number,
  receivedQty: number,
  unitPrice: number,
  billedAs: string | null | undefined,
) {
  if (billedAs !== BILLED_AS.FULL_ORDERED) return 0;
  const missingQty = Math.max(0, orderedQty - receivedQty);
  return missingQty * unitPrice;
}

export function billedAsLabel(value: string | null | undefined) {
  if (value === BILLED_AS.FULL_ORDERED) return "חוייבנו לפי הכמות שהוזמנה";
  if (value === BILLED_AS.RECEIVED_ONLY) return "חוייבנו רק לפי מה שהתקבל";
  return null;
}

export function exceptionKindLabel(kind: string) {
  switch (kind) {
    case EXCEPTION_KIND.CREDIT_REQUEST:
      return "בקשת זיכוי";
    case EXCEPTION_KIND.MISSING_NO_CREDIT:
      return "חסר פריט ולא ביקשנו זיכוי";
    case EXCEPTION_KIND.ON_THE_WAY:
      return "בדרך מהספק";
    default:
      return kind;
  }
}

export function exceptionStatusLabel(status: string) {
  switch (status) {
    case EXCEPTION_STATUS.OPEN:
      return "פתוח";
    case EXCEPTION_STATUS.CONFIRMED:
      return "זיכוי אושר / התקבל";
    case EXCEPTION_STATUS.ARRIVED:
      return "הסחורה הגיעה";
    case EXCEPTION_STATUS.CANCELLED:
      return "בוטל";
    default:
      return status;
  }
}

export function exceptionTitle(kind: string, productName: string, amountIls = 0) {
  if (kind === EXCEPTION_KIND.CREDIT_REQUEST) {
    return `בקשת זיכוי · ${productName}${amountIls > 0 ? ` · ${formatIls(amountIls)}` : ""}`;
  }
  if (kind === EXCEPTION_KIND.MISSING_NO_CREDIT) {
    return `חסר פריט ולא ביקשנו זיכוי · ${productName}`;
  }
  if (kind === EXCEPTION_KIND.ON_THE_WAY) {
    return `בדרך מהספק · ${productName}`;
  }
  return productName;
}

export function parseMismatchAction(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (value === EXCEPTION_KIND.CREDIT_REQUEST) return EXCEPTION_KIND.CREDIT_REQUEST;
  if (value === EXCEPTION_KIND.ON_THE_WAY) return EXCEPTION_KIND.ON_THE_WAY;
  if (value === EXCEPTION_KIND.MISSING_NO_CREDIT) return EXCEPTION_KIND.MISSING_NO_CREDIT;
  return null;
}

export function parseBilledAs(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (value === BILLED_AS.FULL_ORDERED) return BILLED_AS.FULL_ORDERED;
  if (value === BILLED_AS.RECEIVED_ONLY) return BILLED_AS.RECEIVED_ONLY;
  return null;
}
