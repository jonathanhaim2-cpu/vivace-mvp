import { PHOTO_DOCUMENT_TYPE } from "@/lib/constants";

export const REQUEST_KIND = {
  CREDIT: "CREDIT",
  CHARGE: "CHARGE",
} as const;

export const REQUEST_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const ARRIVAL_MARK = {
  OK: "OK",
  NOT_ARRIVED: "NOT_ARRIVED",
  ARRIVED_LESS: "ARRIVED_LESS",
  ARRIVED_MORE: "ARRIVED_MORE",
} as const;

export type ArrivalMark = (typeof ARRIVAL_MARK)[keyof typeof ARRIVAL_MARK];
export type RequestKind = (typeof REQUEST_KIND)[keyof typeof REQUEST_KIND];

export type RequestLineInput = {
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice?: number | null;
  /** Explicit receiver mark. When omitted, derived from quantities. */
  mark?: string | null;
  missing?: boolean;
};

export type RequestLineDraft = {
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number | null;
  amountDiff: number;
  mark: Exclude<ArrivalMark, "OK">;
};

export type RequestDraft = {
  kind: RequestKind;
  status: "OPEN";
  lines: RequestLineDraft[];
};

export function resolveArrivalMark(line: RequestLineInput): ArrivalMark {
  const explicit = String(line.mark ?? "").trim();
  if (
    explicit === ARRIVAL_MARK.NOT_ARRIVED ||
    explicit === ARRIVAL_MARK.ARRIVED_LESS ||
    explicit === ARRIVAL_MARK.ARRIVED_MORE
  ) {
    return explicit;
  }
  if (line.missing || line.receivedQty <= 0.009) return ARRIVAL_MARK.NOT_ARRIVED;
  if (line.receivedQty + 0.009 < line.orderedQty) return ARRIVAL_MARK.ARRIVED_LESS;
  if (line.receivedQty > line.orderedQty + 0.009) return ARRIVAL_MARK.ARRIVED_MORE;
  return ARRIVAL_MARK.OK;
}

function amountDiff(mark: ArrivalMark, ordered: number, received: number, unitPrice: number | null) {
  if (unitPrice == null || !Number.isFinite(unitPrice)) return 0;
  if (mark === ARRIVAL_MARK.ARRIVED_MORE) return Math.max(0, received - ordered) * unitPrice;
  if (mark === ARRIVAL_MARK.NOT_ARRIVED || mark === ARRIVAL_MARK.ARRIVED_LESS) {
    return Math.max(0, ordered - received) * unitPrice;
  }
  return 0;
}

/** Credit request for shortages, charge request for over-delivery. Nothing when every line matches. */
export function buildSupplierRequests(lines: RequestLineInput[]): RequestDraft[] {
  const credit: RequestLineDraft[] = [];
  const charge: RequestLineDraft[] = [];
  for (const line of lines) {
    const mark = resolveArrivalMark(line);
    if (mark === ARRIVAL_MARK.OK) continue;
    const unitPrice = line.unitPrice == null || !Number.isFinite(line.unitPrice) ? null : line.unitPrice;
    const draft: RequestLineDraft = {
      productName: line.productName,
      orderedQty: line.orderedQty,
      receivedQty: mark === ARRIVAL_MARK.NOT_ARRIVED ? 0 : line.receivedQty,
      unitPrice,
      amountDiff: amountDiff(mark, line.orderedQty, mark === ARRIVAL_MARK.NOT_ARRIVED ? 0 : line.receivedQty, unitPrice),
      mark,
    };
    if (mark === ARRIVAL_MARK.ARRIVED_MORE) charge.push(draft);
    else credit.push(draft);
  }
  const drafts: RequestDraft[] = [];
  if (credit.length) drafts.push({ kind: REQUEST_KIND.CREDIT, status: REQUEST_STATUS.OPEN, lines: credit });
  if (charge.length) drafts.push({ kind: REQUEST_KIND.CHARGE, status: REQUEST_STATUS.OPEN, lines: charge });
  return drafts;
}

export function requestKindLabel(kind: string) {
  if (kind === REQUEST_KIND.CREDIT) return "בקשת זיכוי";
  if (kind === REQUEST_KIND.CHARGE) return "בקשת חיוב";
  return kind;
}

export function arrivalMarkLabel(mark: string) {
  if (mark === ARRIVAL_MARK.NOT_ARRIVED) return "לא הגיע";
  if (mark === ARRIVAL_MARK.ARRIVED_LESS) return "הגיע פחות";
  if (mark === ARRIVAL_MARK.ARRIVED_MORE) return "הגיע יותר";
  return "הגיע";
}

export type RequestPreviewInput = {
  kind: string;
  supplierName: string;
  documentNumber?: string | null;
  orderNumber: string;
  deliveryDateLabel?: string | null;
  branchName: string;
  lines: RequestLineDraft[];
};

export function renderRequestPreview(input: RequestPreviewInput) {
  const title = requestKindLabel(input.kind);
  const lines = input.lines
    .map((line) => {
      const price =
        line.unitPrice != null
          ? ` · מחיר יח׳ ${line.unitPrice.toFixed(2)} · הפרש ${line.amountDiff.toFixed(2)} ₪`
          : "";
      return `- ${line.productName}: הוזמן ${line.orderedQty}, התקבל ${line.receivedQty} (${arrivalMarkLabel(line.mark)})${price}`;
    })
    .join("\n");
  return [
    title,
    `ספק: ${input.supplierName}`,
    `מספר מסמך: ${input.documentNumber?.trim() || "—"}`,
    `מספר הזמנה: ${input.orderNumber}`,
    `תאריך אספקה: ${input.deliveryDateLabel?.trim() || "—"}`,
    `סניף: ${input.branchName}`,
    "פירוט:",
    lines,
  ].join("\n");
}

/**
 * A credit request closes only when a supplier credit note is matched.
 * Charge requests are not closed by a credit note.
 * Sending email does not close the request.
 */
export function closeRequestWithCreditNote(
  request: { kind: string; status: string },
  note: { documentType?: string | null },
): { status: string; closed: boolean; error?: string } {
  if (request.kind !== REQUEST_KIND.CREDIT) {
    return { status: request.status, closed: false, error: "תעודת זיכוי סוגרת רק בקשת זיכוי" };
  }
  if (note.documentType !== PHOTO_DOCUMENT_TYPE.CREDIT_NOTE) {
    return { status: request.status, closed: false, error: "אפשר לשייך רק תעודת זיכוי" };
  }
  if (request.status === REQUEST_STATUS.CLOSED) return { status: REQUEST_STATUS.CLOSED, closed: true };
  return { status: REQUEST_STATUS.CLOSED, closed: true };
}

/** Outbound email is not configured. Never send without an explicit confirm click. */
export function canEmailSupplierRequest(confirmed: boolean) {
  return confirmed === true;
}
