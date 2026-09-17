import assert from "node:assert/strict";
import test from "node:test";
import {
  addInvoiceAmountToCategory,
  catalogCategoryAccounts,
  invoiceInReportMonth,
  overallPurchasePercent,
  parentCategoryIdForAccount,
  relativeShare,
  barsScaledToMax,
  pairedBarPercents,
  resolvedInvoiceBranchId,
  standaloneInvoiceCountsForBranch,
} from "./purchase-fill";

const categories = catalogCategoryAccounts();

test("maps classified food accounts to parent purchase categories", () => {
  assert.equal(parentCategoryIdForAccount("acc_food_produce", categories), "pcat_produce");
  assert.equal(parentCategoryIdForAccount("acc_food_dairy", categories), "pcat_dairy");
  assert.equal(parentCategoryIdForAccount("acc_food_pasta", categories), "pcat_dough");
  assert.equal(parentCategoryIdForAccount("acc_payroll_kitchen", categories), null);
  assert.equal(parentCategoryIdForAccount(null, categories), null);
});

test("standalone invoice amounts add to category spend without a goods receipt", () => {
  const spent = new Map<string, number>([["pcat_produce", 100]]);
  addInvoiceAmountToCategory(spent, "acc_food_produce", 2140, categories);
  addInvoiceAmountToCategory(spent, "acc_food_dairy", 800, categories);
  addInvoiceAmountToCategory(spent, "acc_food_produce", 0, categories);
  assert.equal(spent.get("pcat_produce"), 2240);
  assert.equal(spent.get("pcat_dairy"), 800);
});

test("receipt-linked photos are excluded so lines are not double-counted", () => {
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: "gr1", branchId: "b1" }, "b1"), false);
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: null, branchId: "b1" }, "b1"), true);
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: null, branchId: "b1" }, "b2"), false);
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: null, branchId: "b1" }, null), true);
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: null, branchId: null }, "b1"), false);
  assert.equal(standaloneInvoiceCountsForBranch({ goodsReceiptId: null, branchId: null }, null), true);
});

test("branch attribution prefers InvoicePhoto.branchId then Order.branchId", () => {
  assert.equal(resolvedInvoiceBranchId({ branchId: "kiryat" }), "kiryat");
  assert.equal(
    resolvedInvoiceBranchId({
      branchId: null,
      goodsReceipt: { order: { branchId: "beit" } },
    }),
    "beit",
  );
  assert.equal(resolvedInvoiceBranchId({ branchId: null, goodsReceipt: null }), null);
});

test("periodMonth wins over createdAt when deciding the report month", () => {
  assert.equal(invoiceInReportMonth({ periodMonth: "2026-09", createdAt: "2026-08-01" }, "2026-09", false), true);
  assert.equal(invoiceInReportMonth({ periodMonth: "2026-08" }, "2026-09", true), false);
  assert.equal(invoiceInReportMonth({ periodMonth: null }, "2026-09", true), true);
  assert.equal(invoiceInReportMonth({ periodMonth: null }, "2026-09", false), false);
});

test("purchase % uses forecast turnover and comparison shares stay balanced", () => {
  assert.equal(overallPurchasePercent(30000, 200000)?.toFixed(1), "15.0");
  assert.equal(overallPurchasePercent(100, 0), null);
  assert.deepEqual(relativeShare(80, 20), { left: 80, right: 20 });
  assert.deepEqual(relativeShare(0, 0), { left: 50, right: 50 });
});

test("paired bars scale to the max value and keep zero as an empty track", () => {
  assert.deepEqual(pairedBarPercents(80, 20), { left: 100, right: 25 });
  assert.deepEqual(pairedBarPercents(0, 50), { left: 0, right: 100 });
  assert.deepEqual(pairedBarPercents(0, 0), { left: 0, right: 0 });
  assert.deepEqual(pairedBarPercents(-4, Number.NaN), { left: 0, right: 0 });
  assert.deepEqual(barsScaledToMax([10, 0, 5]), [100, 0, 50]);
});
