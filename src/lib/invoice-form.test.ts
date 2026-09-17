import assert from "node:assert/strict";
import test from "node:test";
import {
  invoiceClassificationFromForm,
  isInvoicePdf,
  parseAmountIls,
  parseInvoiceDateInput,
  toDateInputValue,
} from "./invoice-form";
import { parsePhotoDocumentType, PHOTO_DOCUMENT_TYPE } from "./constants";

test("parseInvoiceDateInput keeps ISO dates", () => {
  assert.equal(parseInvoiceDateInput("2026-09-15"), "2026-09-15");
  assert.equal(parseInvoiceDateInput("2026-09-15T12:00:00Z"), "2026-09-15");
});

test("parseInvoiceDateInput reads Israeli DD/MM/YYYY", () => {
  assert.equal(parseInvoiceDateInput("15/09/2026"), "2026-09-15");
  assert.equal(parseInvoiceDateInput("5.9.2026"), "2026-09-05");
});

test("parseInvoiceDateInput treats empty as null", () => {
  assert.equal(parseInvoiceDateInput(""), null);
  assert.equal(parseInvoiceDateInput("  "), null);
  assert.equal(parseInvoiceDateInput(null), null);
});

test("toDateInputValue only emits values a date input accepts", () => {
  assert.equal(toDateInputValue("2026-09-15"), "2026-09-15");
  assert.equal(toDateInputValue("15/09/2026"), "2026-09-15");
  assert.equal(toDateInputValue("לא ידוע"), "");
});

test("parseAmountIls accepts decimals, thousands, and empty", () => {
  assert.equal(parseAmountIls("1840.5"), 1840.5);
  assert.equal(parseAmountIls("1840,5"), 1840.5);
  assert.equal(parseAmountIls("1,250.50"), 1250.5);
  assert.equal(parseAmountIls(""), null);
});

test("isInvoicePdf detects mime and extension", () => {
  assert.equal(isInvoicePdf("application/pdf", "a.jpg"), true);
  assert.equal(isInvoicePdf("application/octet-stream", "invoice.PDF"), true);
  assert.equal(isInvoicePdf("image/jpeg", "PHOTO.jpg"), false);
});

test("invoiceClassificationFromForm maps pending-queue fields", () => {
  const form = new FormData();
  form.set("invoiceDate", "2026-08-17");
  form.set("periodMonth", "");
  form.set("supplierName", "  ירקות השרון  ");
  form.set("amountIls", "2140");
  form.set("accountId", "acc_food_produce");
  form.set("branchId", "br_kiryat");
  form.set("note", "נבדק ידנית");
  const parsed = invoiceClassificationFromForm(form);
  assert.deepEqual(parsed, {
    invoiceDate: "2026-08-17",
    supplierName: "ירקות השרון",
    amountIls: 2140,
    note: "נבדק ידנית",
    accountId: "acc_food_produce",
    periodMonth: "2026-08",
    branchId: "br_kiryat",
    documentType: "UNKNOWN",
  });
});

test("invoiceClassificationFromForm treats missing branch as null", () => {
  const form = new FormData();
  form.set("accountId", "acc_food_dairy");
  form.set("periodMonth", "2026-09");
  assert.equal(invoiceClassificationFromForm(form).branchId, null);
  assert.equal(invoiceClassificationFromForm(form).documentType, "UNKNOWN");
});

test("invoiceClassificationFromForm reads document type", () => {
  const form = new FormData();
  form.set("accountId", "acc_food_produce");
  form.set("periodMonth", "2026-09");
  form.set("documentType", "RECEIPT");
  assert.equal(invoiceClassificationFromForm(form).documentType, "RECEIPT");
  form.set("documentType", "חשבונית");
  assert.equal(invoiceClassificationFromForm(form).documentType, "INVOICE");
  form.set("documentType", "CREDIT_NOTE");
  assert.equal(invoiceClassificationFromForm(form).documentType, "CREDIT_NOTE");
  form.set("documentType", "חשבונית זיכוי");
  assert.equal(invoiceClassificationFromForm(form).documentType, "CREDIT_NOTE");
});

test("parsePhotoDocumentType maps Hebrew and English aliases", () => {
  assert.equal(parsePhotoDocumentType("INVOICE"), PHOTO_DOCUMENT_TYPE.INVOICE);
  assert.equal(parsePhotoDocumentType("receipt"), PHOTO_DOCUMENT_TYPE.RECEIPT);
  assert.equal(parsePhotoDocumentType("קבלה"), PHOTO_DOCUMENT_TYPE.RECEIPT);
  assert.equal(parsePhotoDocumentType("חשבונית"), PHOTO_DOCUMENT_TYPE.INVOICE);
  assert.equal(parsePhotoDocumentType("CREDIT_NOTE"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("credit_invoice"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("credit note"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("חשבונית זיכוי"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("חשבונית מס זיכוי"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("זיכוי"), PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(parsePhotoDocumentType("לא ידוע"), PHOTO_DOCUMENT_TYPE.UNKNOWN);
  assert.equal(parsePhotoDocumentType(""), PHOTO_DOCUMENT_TYPE.UNKNOWN);
  assert.equal(parsePhotoDocumentType("nope"), PHOTO_DOCUMENT_TYPE.UNKNOWN);
});

test("invoiceClassificationFromForm maps רשת sentinel to null branchId", () => {
  const form = new FormData();
  form.set("accountId", "acc_admin_consulting");
  form.set("periodMonth", "2026-09");
  form.set("branchId", "network");
  assert.equal(invoiceClassificationFromForm(form).branchId, null);
});
