import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_DOCUMENT_TYPE } from "./constants";
import {
  REQUEST_KIND,
  REQUEST_STATUS,
  buildSupplierRequests,
  canEmailSupplierRequest,
  closeRequestWithCreditNote,
  renderRequestPreview,
} from "./supplier-requests";

test("a shortage creates an open credit request and over-delivery creates a charge request", () => {
  const drafts = buildSupplierRequests([
    { productName: "קמח", orderedQty: 10, receivedQty: 0, unitPrice: 5, mark: "NOT_ARRIVED" },
    { productName: "עגבניות", orderedQty: 8, receivedQty: 3, unitPrice: 4, mark: "ARRIVED_LESS" },
    { productName: "גבינה", orderedQty: 4, receivedQty: 6, unitPrice: 10, mark: "ARRIVED_MORE" },
    { productName: "שמן", orderedQty: 2, receivedQty: 2, unitPrice: 20, mark: "OK" },
  ]);

  assert.equal(drafts.length, 2);
  const credit = drafts.find((draft) => draft.kind === REQUEST_KIND.CREDIT);
  const charge = drafts.find((draft) => draft.kind === REQUEST_KIND.CHARGE);
  assert.ok(credit);
  assert.ok(charge);
  assert.equal(credit.status, REQUEST_STATUS.OPEN);
  assert.equal(charge.status, REQUEST_STATUS.OPEN);
  assert.deepEqual(
    credit.lines.map((line) => line.productName),
    ["קמח", "עגבניות"],
  );
  assert.equal(credit.lines[0].amountDiff, 50);
  assert.equal(credit.lines[1].amountDiff, 20);
  assert.equal(charge.lines[0].productName, "גבינה");
  assert.equal(charge.lines[0].amountDiff, 20);
});

test("quantities derive the mark when the receiver does not set one", () => {
  const drafts = buildSupplierRequests([
    { productName: "בצל", orderedQty: 5, receivedQty: 0, unitPrice: 2, missing: true },
    { productName: "פלפל", orderedQty: 5, receivedQty: 7, unitPrice: 3 },
  ]);
  assert.equal(drafts[0].kind, REQUEST_KIND.CREDIT);
  assert.equal(drafts[0].lines[0].mark, "NOT_ARRIVED");
  assert.equal(drafts[1].kind, REQUEST_KIND.CHARGE);
});

test("matching a credit note closes the credit request and leaves the charge request open", () => {
  const credit = closeRequestWithCreditNote(
    { kind: REQUEST_KIND.CREDIT, status: REQUEST_STATUS.OPEN },
    { documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE },
  );
  assert.equal(credit.closed, true);
  assert.equal(credit.status, REQUEST_STATUS.CLOSED);

  const charge = closeRequestWithCreditNote(
    { kind: REQUEST_KIND.CHARGE, status: REQUEST_STATUS.OPEN },
    { documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE },
  );
  assert.equal(charge.closed, false);
  assert.equal(charge.status, REQUEST_STATUS.OPEN);

  const wrongDoc = closeRequestWithCreditNote(
    { kind: REQUEST_KIND.CREDIT, status: REQUEST_STATUS.OPEN },
    { documentType: PHOTO_DOCUMENT_TYPE.INVOICE },
  );
  assert.equal(wrongDoc.closed, false);
  assert.equal(wrongDoc.status, REQUEST_STATUS.OPEN);
});

test("the request preview includes document, order, delivery date, branch and quantities", () => {
  const [credit] = buildSupplierRequests([
    { productName: "קמח", orderedQty: 10, receivedQty: 0, unitPrice: 5, mark: "NOT_ARRIVED" },
  ]);
  const text = renderRequestPreview({
    kind: credit.kind,
    supplierName: "טחנות",
    documentNumber: "44821",
    orderNumber: "ord_1",
    deliveryDateLabel: "26/09/2026",
    branchName: "בית שמש",
    lines: credit.lines,
  });
  assert.match(text, /בקשת זיכוי/);
  assert.match(text, /44821/);
  assert.match(text, /ord_1/);
  assert.match(text, /26\/09\/2026/);
  assert.match(text, /בית שמש/);
  assert.match(text, /קמח: הוזמן 10, התקבל 0/);
});

test("email is not sent unless the receiver confirms", () => {
  assert.equal(canEmailSupplierRequest(false), false);
  assert.equal(canEmailSupplierRequest(true), true);
});
