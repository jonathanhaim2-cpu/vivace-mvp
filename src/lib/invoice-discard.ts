/** Kept on discard so IMAP sync will not re-pull the same Message-ID + hash. */
export const KEEP_MAIL_IMPORT_ON_DISCARD = true;

const NOT_INVOICE_REASON_RE =
  /אינ[הום]|אינה|לא\s+.*(חשבונית|קבלה)|אינו\s+חשבונית|not an invoice/i;

const LOW_CONFIDENCE = 0.55;

export type InvoiceDiscardSignals = {
  id?: string;
  originalName: string;
  fileName?: string;
  isDuplicate?: boolean;
  accountId?: string | null;
  paid?: boolean;
  sentToAccountant?: boolean;
  aiAccountId?: string | null;
  aiConfidence?: number | null;
  aiReason?: string | null;
  aiStatus?: string | null;
  aiSupplierName?: string | null;
  aiTotalIls?: number | null;
};

export function invoiceDiscardBlockedReason(
  photo: Pick<InvoiceDiscardSignals, "paid" | "sentToAccountant"> | null | undefined,
) {
  if (!photo) return "חשבונית לא נמצאה";
  if (photo.paid) return "לא ניתן למחוק חשבונית שסומנה כשולמה";
  if (photo.sentToAccountant) return "לא ניתן למחוק חשבונית שנשלחה להנה״ח";
  return null;
}

export function canDiscardInvoicePhoto(
  photo: Pick<InvoiceDiscardSignals, "paid" | "sentToAccountant"> | null | undefined,
) {
  return invoiceDiscardBlockedReason(photo) == null;
}

/** True when the vision model already said this is not an invoice (or extracted nothing). */
export function isAiNotInvoiceSuggestion(
  photo: Pick<
    InvoiceDiscardSignals,
    "aiAccountId" | "aiConfidence" | "aiReason" | "aiStatus" | "aiSupplierName" | "aiTotalIls"
  >,
) {
  const reason = (photo.aiReason ?? "").replace(/\s+/g, " ").trim();
  if (NOT_INVOICE_REASON_RE.test(reason)) return true;
  if (!reason) return false;
  if (photo.aiStatus && !["SUGGESTED", "MANUAL"].includes(photo.aiStatus)) return false;
  const noInvoiceFields = !photo.aiAccountId && !photo.aiSupplierName && photo.aiTotalIls == null;
  return noInvoiceFields && (photo.aiConfidence == null || photo.aiConfidence < LOW_CONFIDENCE);
}

export function invoiceDiscardAuditSummary(
  photo: Pick<InvoiceDiscardSignals, "originalName" | "isDuplicate" | "accountId">,
) {
  if (photo.isDuplicate) return `נמחקה חשבונית כפולה · ${photo.originalName}`;
  if (photo.accountId) return `נמחקה חשבונית משובצת · ${photo.originalName}`;
  return `נמחק מסמך לא רלוונטי מהתור · ${photo.originalName}`;
}

export function invoiceDiscardConfirmMessage(photo: {
  isDuplicate?: boolean;
  accountId?: string | null;
  notInvoice?: boolean;
}) {
  if (photo.isDuplicate) return "למחוק את הכפיל? המסמך המקורי יישאר.";
  if (photo.notInvoice) {
    return "ה-AI סימן שזה אינו חשבונית. למחוק מהתור? אותו קובץ מהמייל לא יימשך שוב.";
  }
  if (photo.accountId) return "למחוק חשבונית שכבר שובצה? היא תוסר מהכרטסת.";
  return "למחוק את המסמך מהתור? הוא יוסר מרשימת הסיווג. קובץ שהגיע במייל לא יימשך שוב.";
}
