import assert from "node:assert/strict";
import test from "node:test";
import { PHOTO_DOCUMENT_TYPE } from "./constants";
import {
  countsTowardPurchase,
  includeInAccountantPackage,
  isInHouseDocument,
  isStatementDocument,
  normalizeCreditEntryAmount,
  parsePaidFlag,
  restoreUnpaidAmount,
  signedDocumentAmount,
  splitVat,
} from "./money";

test("credit notes sign positive stored amounts as negative spend", () => {
  assert.equal(signedDocumentAmount({ documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, amountIls: 180 }), -180);
  assert.equal(signedDocumentAmount({ documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, amountIls: -90 }), -90);
  assert.equal(signedDocumentAmount({ documentType: PHOTO_DOCUMENT_TYPE.INVOICE, amountIls: 180 }), 180);
  assert.equal(signedDocumentAmount({ documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, aiTotalIls: 10 }), -10);
});

test("normalizeCreditEntryAmount lets users type a minus or a positive credit total", () => {
  assert.equal(normalizeCreditEntryAmount(PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, 250), -250);
  assert.equal(normalizeCreditEntryAmount(PHOTO_DOCUMENT_TYPE.CREDIT_NOTE, -250), -250);
  assert.equal(normalizeCreditEntryAmount(PHOTO_DOCUMENT_TYPE.INVOICE, 250), 250);
});

test("delivery notes are in-house; statements are not invoices; both skip accountant ZIP", () => {
  assert.equal(isInHouseDocument(PHOTO_DOCUMENT_TYPE.DELIVERY_NOTE), true);
  assert.equal(isStatementDocument(PHOTO_DOCUMENT_TYPE.STATEMENT), true);
  assert.equal(countsTowardPurchase(PHOTO_DOCUMENT_TYPE.DELIVERY_NOTE), false);
  assert.equal(countsTowardPurchase(PHOTO_DOCUMENT_TYPE.STATEMENT), false);
  assert.equal(countsTowardPurchase(PHOTO_DOCUMENT_TYPE.INVOICE), true);
  assert.equal(includeInAccountantPackage(PHOTO_DOCUMENT_TYPE.DELIVERY_NOTE), false);
  assert.equal(includeInAccountantPackage(PHOTO_DOCUMENT_TYPE.STATEMENT), false);
  assert.equal(includeInAccountantPackage(PHOTO_DOCUMENT_TYPE.CREDIT_NOTE), true);
});

test("VAT split covers inclusive and exclusive totals", () => {
  const incl = splitVat(118, true, 0.18);
  assert.equal(incl.amountInclVat, 118);
  assert.equal(Math.round(incl.amountExVat * 100) / 100, 100);
  const ex = splitVat(100, false, 0.18);
  assert.equal(ex.amountExVat, 100);
  assert.equal(ex.amountInclVat, 118);
});

test("parsePaidFlag treats off/false as unpaid", () => {
  assert.equal(parsePaidFlag("on"), true);
  assert.equal(parsePaidFlag("true"), true);
  assert.equal(parsePaidFlag("שולם"), true);
  assert.equal(parsePaidFlag("off"), false);
  assert.equal(parsePaidFlag("false"), false);
  assert.equal(parsePaidFlag(""), false);
});

test("restoreUnpaidAmount brings back original/AI total after a zeroed save", () => {
  assert.equal(restoreUnpaidAmount({ amountIls: 0, originalAmountIls: 2140, aiTotalIls: 2140 }), 2140);
  assert.equal(restoreUnpaidAmount({ amountIls: 0, originalAmountIls: null, aiTotalIls: 90 }), 90);
  assert.equal(restoreUnpaidAmount({ amountIls: 50, originalAmountIls: 2140 }), 50);
});
