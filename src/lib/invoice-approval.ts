export const INVOICE_APPROVAL = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export function approvalForSource(source: string) {
  return source === "EMAIL" ? INVOICE_APPROVAL.PENDING : INVOICE_APPROVAL.APPROVED;
}

export function countsInReports(approvalStatus: string | null | undefined) {
  return approvalStatus !== INVOICE_APPROVAL.PENDING && approvalStatus !== INVOICE_APPROVAL.REJECTED;
}

export function invoiceMismatchFlags(input: {
  evidenceBranchId?: string | null;
  selectedBranchId?: string | null;
  orderUnitPrice?: number | null;
  invoiceUnitPrice?: number | null;
  orderQty?: number | null;
  invoiceQty?: number | null;
}) {
  const flags: string[] = [];
  if (
    input.evidenceBranchId &&
    input.selectedBranchId &&
    input.evidenceBranchId !== input.selectedBranchId
  ) {
    flags.push("סניף לא תואם לראיה במסמך");
  }
  if (
    input.orderUnitPrice != null &&
    input.invoiceUnitPrice != null &&
    Math.abs(input.orderUnitPrice - input.invoiceUnitPrice) > 0.05
  ) {
    flags.push("מחיר שונה מההזמנה");
  }
  if (
    input.orderQty != null &&
    input.invoiceQty != null &&
    Math.abs(input.orderQty - input.invoiceQty) > 0.001
  ) {
    flags.push("כמות שונה מההזמנה");
  }
  return flags;
}
