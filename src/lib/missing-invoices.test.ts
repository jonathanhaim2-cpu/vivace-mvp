import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedInvoicesPerMonth,
  fixedExpenseMessage,
  isFixedExpenseMissing,
  isInvoiceCountShort,
  missingSupplierInvoicesMessage,
  previousFullMonthKeys,
} from "./missing-invoices";

test("a fixed expense is missing only after the charge day plus 3 days with no invoice", () => {
  const rent = { chargeDay: 1, matchedInvoiceCountThisMonth: 0, active: true };
  assert.equal(isFixedExpenseMissing({ ...rent, today: { year: 2026, month: 9, date: 4 } }), false);
  assert.equal(isFixedExpenseMissing({ ...rent, today: { year: 2026, month: 9, date: 5 } }), true);
  assert.equal(
    isFixedExpenseMissing({ ...rent, matchedInvoiceCountThisMonth: 1, today: { year: 2026, month: 9, date: 20 } }),
    false,
  );
  assert.equal(
    isFixedExpenseMissing({ chargeDay: 15, matchedInvoiceCountThisMonth: 0, today: { year: 2026, month: 9, date: 18 } }),
    false,
  );
  assert.equal(
    isFixedExpenseMissing({ chargeDay: 15, matchedInvoiceCountThisMonth: 0, today: { year: 2026, month: 9, date: 19 } }),
    true,
  );
  assert.match(fixedExpenseMessage("שכירות"), /שכירות/);
});

test("supplier expected invoices are the 3-month average unless overridden", () => {
  assert.equal(expectedInvoicesPerMonth({ countsLast3FullMonths: [2, 2, 2] }), 2);
  assert.equal(expectedInvoicesPerMonth({ countsLast3FullMonths: [1, 0, 2] }), 1);
  assert.equal(expectedInvoicesPerMonth({ countsLast3FullMonths: [4, 4, 4], manualOverride: 1 }), 1);
  assert.equal(expectedInvoicesPerMonth({ countsLast3FullMonths: [4, 4, 4], manualOverride: 0 }), 0);
  assert.deepEqual(previousFullMonthKeys({ year: 2026, month: 9, date: 26 }), ["2026-08", "2026-07", "2026-06"]);
});

test("fewer invoices than expected this month is a red missing-invoice exception", () => {
  const expected = expectedInvoicesPerMonth({ countsLast3FullMonths: [3, 3, 3] });
  assert.equal(isInvoiceCountShort(3, expected), false);
  assert.equal(isInvoiceCountShort(2, expected), true);
  assert.equal(isInvoiceCountShort(0, expected), true);
  assert.equal(isInvoiceCountShort(0, expectedInvoicesPerMonth({ countsLast3FullMonths: [0, 0, 0] })), false);
  const overridden = expectedInvoicesPerMonth({ countsLast3FullMonths: [1, 1, 1], manualOverride: 4 });
  assert.equal(isInvoiceCountShort(3, overridden), true);
  assert.match(missingSupplierInvoicesMessage("שליחויות", 0, 2), /חסרות חשבוניות/);
});
