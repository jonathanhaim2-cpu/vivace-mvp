export type ExpenseCandidate = {
  id: string;
  name: string;
  kind: string;
  active?: boolean;
  supplierId?: string | null;
  keywords?: string | null;
  branchId?: string | null;
};

export type InvoiceMatchInput = {
  supplierId?: string | null;
  supplierName?: string | null;
  text?: string | null;
  branchId?: string | null;
};

function keywordsOf(raw: string | null | undefined) {
  return String(raw ?? "")
    .split(/[,،\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function includesLoose(haystack: string, needle: string) {
  return haystack.toLocaleLowerCase("he").includes(needle.toLocaleLowerCase("he"));
}

/**
 * Auto-match an approved invoice to one expense.
 * Supplier id wins, then supplier name, then keywords in the document text.
 * A branch-scoped expense only matches that branch (or a network invoice with no branch).
 */
export function pickExpenseMatch(invoice: InvoiceMatchInput, expenses: ExpenseCandidate[]): ExpenseCandidate | null {
  const pool = expenses.filter((row) => row.active !== false && row.kind === "EXPENSE");
  const scoped = pool.filter((row) => {
    if (!row.branchId) return true;
    if (!invoice.branchId) return false;
    return row.branchId === invoice.branchId;
  });
  const text = `${invoice.supplierName ?? ""} ${invoice.text ?? ""}`;

  const bySupplier = invoice.supplierId
    ? scoped.filter((row) => row.supplierId && row.supplierId === invoice.supplierId)
    : [];
  if (bySupplier.length === 1) return bySupplier[0];
  if (bySupplier.length > 1) {
    const named = bySupplier.find((row) => keywordsOf(row.keywords).some((word) => includesLoose(text, word)));
    return named ?? bySupplier[0];
  }

  const name = invoice.supplierName?.trim();
  if (name) {
    const byName = scoped.filter((row) => row.supplierId == null && includesLoose(row.name, name));
    if (byName.length === 1) return byName[0];
  }

  const byKeyword = scoped.filter((row) => keywordsOf(row.keywords).some((word) => includesLoose(text, word)));
  if (byKeyword.length === 0) return null;
  byKeyword.sort((a, b) => keywordsOf(b.keywords).length - keywordsOf(a.keywords).length);
  return byKeyword[0];
}
