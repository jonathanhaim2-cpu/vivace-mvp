import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveInvoiceListStatus,
  invoiceDateDisplay,
  invoiceDocumentNumber,
  invoiceGroupLabel,
  isAwaitingTreatment,
  isMissingInvoiceBranch,
  shiftDateKey,
} from "./invoice-list-status";

test("deriveInvoiceListStatus uses approval, missing branch, then classification", () => {
  assert.equal(
    deriveInvoiceListStatus({ accountId: "acc", branchId: "br", approvalStatus: "APPROVED" }),
    "classified",
  );
  assert.equal(
    deriveInvoiceListStatus({ accountId: "acc", branchId: "br", approvalStatus: "PENDING" }),
    "awaiting_approval",
  );
  assert.equal(
    deriveInvoiceListStatus({ accountId: null, branchId: "br", approvalStatus: "APPROVED" }),
    "pending_classification",
  );
  assert.equal(
    deriveInvoiceListStatus({ accountId: "acc", branchId: null, approvalStatus: "APPROVED" }),
    "missing_branch",
  );
  assert.equal(
    deriveInvoiceListStatus({ accountId: "acc", branchId: "", approvalStatus: "APPROVED" }),
    "missing_branch",
  );
  assert.equal(
    deriveInvoiceListStatus({
      accountId: null,
      branchId: null,
      approvalStatus: "PENDING",
    }),
    "awaiting_approval",
  );
  assert.equal(
    deriveInvoiceListStatus({
      accountId: "acc",
      branchId: null,
      approvalStatus: "APPROVED",
      aiNetworkExpense: true,
    }),
    "classified",
  );
});

test("isMissingInvoiceBranch treats null branch as missing and network expense as assigned", () => {
  assert.equal(isMissingInvoiceBranch({ branchId: null }), true);
  assert.equal(isMissingInvoiceBranch({ branchId: "br" }), false);
  assert.equal(isMissingInvoiceBranch({ branchId: null, aiNetworkExpense: true }), false);
});

test("awaiting treatment is pending approval or not yet classified", () => {
  assert.equal(isAwaitingTreatment({ approvalStatus: "PENDING", accountId: "acc", branchId: "br" }), true);
  assert.equal(isAwaitingTreatment({ approvalStatus: "APPROVED", accountId: null, branchId: "br" }), true);
  assert.equal(isAwaitingTreatment({ approvalStatus: "APPROVED", accountId: "acc", branchId: null }), false);
});

test("invoice number drops the file extension", () => {
  assert.equal(invoiceDocumentNumber("RC269013195.pdf"), "RC269013195");
  assert.equal(invoiceDocumentNumber("scan.jpg"), "scan");
  assert.equal(invoiceDocumentNumber(""), "—");
});

test("date groups use היום, אתמול, then DD.MM", () => {
  assert.equal(shiftDateKey("2026-09-01", -1), "2026-08-31");
  assert.equal(invoiceGroupLabel("2026-09-26", "2026-09-26"), "היום");
  assert.equal(invoiceGroupLabel("2026-09-25", "2026-09-26"), "אתמול");
  assert.equal(invoiceGroupLabel("2026-09-24", "2026-09-26"), "24.09");
  assert.equal(invoiceDateDisplay("2026-09-17"), "17.09.2026");
});
