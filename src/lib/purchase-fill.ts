import { PRODUCT_CATEGORIES } from "@/lib/product-categories";

export type CategoryAccount = {
  id: string;
  parentId: string | null;
  accountId: string | null;
};

/** Pasta is a food leaf without its own parent product-category; fold into dough/pasta. */
const ACCOUNT_PARENT_FALLBACK: Record<string, string> = {
  acc_food_pasta: "pcat_dough",
};

export function parentCategoryIdForAccount(
  accountId: string | null | undefined,
  categories: CategoryAccount[],
): string | null {
  if (!accountId) return null;
  const hits = categories.filter((category) => category.accountId === accountId);
  const parentHit = hits.find((category) => !category.parentId);
  if (parentHit) return parentHit.id;
  if (hits[0]?.parentId) return hits[0].parentId;
  if (hits[0]) return hits[0].id;
  return ACCOUNT_PARENT_FALLBACK[accountId] ?? null;
}

export function catalogCategoryAccounts(): CategoryAccount[] {
  return PRODUCT_CATEGORIES.flatMap((parent) => [
    { id: parent.id, parentId: null, accountId: parent.accountId },
    ...parent.children.map((child) => ({
      id: child.id,
      parentId: parent.id,
      accountId: child.accountId ?? parent.accountId,
    })),
  ]);
}

export function addInvoiceAmountToCategory(
  spentByParent: Map<string, number>,
  accountId: string | null | undefined,
  amount: number | null | undefined,
  categories: CategoryAccount[],
) {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return;
  const parentId = parentCategoryIdForAccount(accountId, categories);
  if (!parentId) return;
  spentByParent.set(parentId, (spentByParent.get(parentId) ?? 0) + amount);
}

export function resolvedInvoiceBranchId(photo: {
  branchId?: string | null;
  goodsReceipt?: { order?: { branchId?: string | null } | null } | null;
}): string | null {
  return photo.branchId ?? photo.goodsReceipt?.order?.branchId ?? null;
}

/** Receipt-linked photos are already counted from GoodsReceipt lines — skip to avoid double count.
 *  Null branchId is a network expense: counts in network-wide totals, never in a single branch's %. */
export function standaloneInvoiceCountsForBranch(
  photo: {
    goodsReceiptId?: string | null;
    branchId?: string | null;
    goodsReceipt?: { order?: { branchId?: string | null } | null } | null;
  },
  branchId?: string | null,
) {
  if (photo.goodsReceiptId) return false;
  if (!branchId) return true;
  return resolvedInvoiceBranchId(photo) === branchId;
}

export function invoiceInReportMonth(
  photo: { periodMonth?: string | null; createdAt?: Date | string | null },
  month: string,
  createdAtInMonth: boolean,
) {
  if (photo.periodMonth) return photo.periodMonth === month;
  return createdAtInMonth;
}

export function overallPurchasePercent(spent: number, forecast: number) {
  if (!Number.isFinite(spent) || !Number.isFinite(forecast) || forecast <= 0) return null;
  return (spent / forecast) * 100;
}

export function relativeShare(left: number, right: number) {
  const total = left + right;
  if (total <= 0) return { left: 50, right: 50 };
  return { left: (left / total) * 100, right: (right / total) * 100 };
}
