import assert from "node:assert/strict";
import test from "node:test";
import { monthKeyFromDate } from "./months";
import {
  invoicesDupRedirect,
  invoicesFilterQuery,
  matchesClassifiedFilters,
  matchesDocumentTypeFilter,
  matchesPendingFilters,
  parseInvoiceFilters,
  photoDateKey,
  photoPeriodMonth,
  uniqueSupplierNames,
  matchesSearch,
  type InvoiceFilterPhoto,
} from "./invoice-filters";

function photo(overrides: Partial<InvoiceFilterPhoto> = {}): InvoiceFilterPhoto {
  return {
    accountId: "acc_food_produce",
    originalName: "PHOTO-2026-09-15-51-25.jpg",
    fileName: "abc.jpg",
    periodMonth: "2026-09",
    createdAt: new Date("2026-09-15T12:00:00Z"),
    amountIls: 245,
    aiTotalIls: 245,
    aiInvoiceDate: "2026-09-15",
    aiSupplierName: "ירקות השרון",
    supplierName: null,
    branchId: "br_kiryat",
    documentType: "INVOICE",
    ...overrides,
  };
}

test("parseInvoiceFilters defaults to current month and all statuses", () => {
  const filters = parseInvoiceFilters({});
  assert.equal(filters.month, monthKeyFromDate());
  assert.equal(filters.status, "all");
  assert.equal(filters.category, "");
  assert.equal(filters.from, "");
  assert.equal(filters.to, "");
  assert.equal(filters.q, "");
  assert.equal(filters.branch, "");
  assert.equal(filters.documentType, "all");
});

test("parseInvoiceFilters accepts all-months, date range, and classified status", () => {
  const filters = parseInvoiceFilters({
    month: "all",
    from: "2026-09-01",
    to: "2026-09-16",
    category: "acc_food_misc",
    status: "classified",
    q: "  245 ",
    documentType: "RECEIPT",
  });
  assert.equal(filters.month, "all");
  assert.equal(filters.from, "2026-09-01");
  assert.equal(filters.to, "2026-09-16");
  assert.equal(filters.category, "acc_food_misc");
  assert.equal(filters.status, "classified");
  assert.equal(filters.q, "245");
  assert.equal(filters.documentType, "RECEIPT");
});

test("parseInvoiceFilters ignores invalid dates", () => {
  const filters = parseInvoiceFilters({ from: "15/09/2026", to: "not-a-date" });
  assert.equal(filters.from, "");
  assert.equal(filters.to, "");
});

test("classified filters match month, category, supplier, date range, and search", () => {
  const base = parseInvoiceFilters({ month: "2026-09", status: "all" });
  assert.equal(matchesClassifiedFilters(photo(), base), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, month: "2026-08" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, category: "acc_food_dairy" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, category: "acc_food_produce" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, supplier: "ירקות השרון" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, supplier: "אחר" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, branch: "br_kiryat" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, branch: "br_beit" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, q: "245" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, q: "PHOTO-2026" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, q: "לא קיים" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, from: "2026-09-15", to: "2026-09-15" }), true);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, from: "2026-09-16" }), false);
  assert.equal(matchesClassifiedFilters(photo(), { ...base, to: "2026-09-14" }), false);
});

test("pending photos never appear in classified results and ignore the month filter", () => {
  const filters = parseInvoiceFilters({ month: "2026-09" });
  const pending = photo({ accountId: null });
  const pendingAugust = photo({
    accountId: null,
    periodMonth: "2026-08",
    aiInvoiceDate: "2026-08-20",
  });
  assert.equal(matchesClassifiedFilters(pending, filters), false);
  assert.equal(matchesPendingFilters(pending, filters), true);
  assert.equal(matchesPendingFilters(pending, { ...filters, status: "classified" }), false);
  assert.equal(matchesPendingFilters(pending, { ...filters, category: "acc_food_produce" }), false);
  assert.equal(matchesPendingFilters(photo(), filters), false);
  // Analyzing an Aug invoice while the page defaults to Sep must keep it in pending.
  assert.equal(matchesPendingFilters(pendingAugust, filters), true);
  assert.equal(matchesPendingFilters(pending, { ...filters, month: "2026-08" }), true);
  assert.equal(
    matchesClassifiedFilters(photo({ periodMonth: "2026-08", aiInvoiceDate: "2026-08-20" }), filters),
    false,
  );
  assert.equal(matchesPendingFilters(pending, { ...filters, supplier: "ירקות השרון" }), true);
  assert.equal(matchesPendingFilters(pending, { ...filters, supplier: "אחר" }), false);
  assert.equal(matchesPendingFilters(pending, { ...filters, branch: "br_beit" }), false);
  assert.equal(matchesPendingFilters(pending, { ...filters, from: "2026-09-16" }), false);
  assert.equal(matchesPendingFilters(pendingAugust, { ...filters, from: "2026-08-01", to: "2026-08-31" }), true);
  assert.equal(matchesPendingFilters(pending, { ...filters, q: "לא קיים" }), false);
  assert.equal(
    matchesPendingFilters(photo({ accountId: null, documentType: "INVOICE" }), { ...filters, documentType: "RECEIPT" }),
    false,
  );
});

test("invoicesDupRedirect keeps filters and sets dup", () => {
  assert.equal(invoicesDupRedirect(undefined), "/invoices?dup=1");
  assert.equal(invoicesDupRedirect("/orders"), "/invoices?dup=1");
  assert.equal(invoicesDupRedirect("/invoices"), "/invoices?dup=1");
  assert.equal(invoicesDupRedirect("/invoices?month=2026-09&status=pending"), "/invoices?month=2026-09&status=pending&dup=1");
  assert.equal(invoicesDupRedirect("/invoices?imported=3&month=all", "ai"), "/invoices?month=all&dup=ai");
});

test("missing periodMonth falls back to AI invoice date then createdAt month", () => {
  const fromInvoiceDate = photo({ periodMonth: null, aiInvoiceDate: "2026-08-20" });
  assert.equal(photoPeriodMonth(fromInvoiceDate), "2026-08");
  const fromCreatedAt = photo({
    periodMonth: null,
    aiInvoiceDate: null,
    createdAt: new Date("2026-07-20T12:00:00Z"),
  });
  assert.equal(photoPeriodMonth(fromCreatedAt), "2026-07");
  assert.equal(matchesClassifiedFilters(fromInvoiceDate, parseInvoiceFilters({ month: "2026-08" })), true);
});

test("photoDateKey prefers AI invoice date", () => {
  assert.equal(photoDateKey(photo({ aiInvoiceDate: "2026-09-03" })), "2026-09-03");
  assert.equal(photoDateKey(photo({ aiInvoiceDate: null, createdAt: new Date("2026-09-15T12:00:00Z") })), "2026-09-15");
});

test("uniqueSupplierNames prefers goods-receipt supplier then AI name", () => {
  const names = uniqueSupplierNames([
    photo({ supplierName: "סמורי בע״מ", aiSupplierName: "סמורי" }),
    photo({ supplierName: null, aiSupplierName: "ירקות השרון" }),
    photo({ supplierName: "  ", aiSupplierName: null }),
  ]);
  assert.deepEqual(names, ["ירקות השרון", "סמורי בע״מ"]);
});

test("invoicesFilterQuery omits default all-status and empty fields", () => {
  assert.equal(invoicesFilterQuery({ month: "2026-09", status: "all" }), "/invoices?month=2026-09");
  assert.equal(
    invoicesFilterQuery({ month: "all", from: "2026-09-01", category: "acc_food_misc", q: "245" }),
    "/invoices?month=all&from=2026-09-01&category=acc_food_misc&q=245",
  );
  assert.equal(
    invoicesFilterQuery({ month: "2026-09", documentType: "RECEIPT" }),
    "/invoices?month=2026-09&documentType=RECEIPT",
  );
});

test("document type filter matches INVOICE/RECEIPT/UNKNOWN and ignores all", () => {
  const base = parseInvoiceFilters({ month: "2026-09", status: "all" });
  const invoice = photo({ documentType: "INVOICE" });
  const receipt = photo({ documentType: "RECEIPT" });
  const unknown = photo({ documentType: "UNKNOWN" });
  assert.equal(matchesDocumentTypeFilter(invoice, "all"), true);
  assert.equal(matchesDocumentTypeFilter(invoice, "INVOICE"), true);
  assert.equal(matchesDocumentTypeFilter(invoice, "RECEIPT"), false);
  assert.equal(matchesClassifiedFilters(invoice, { ...base, documentType: "INVOICE" }), true);
  assert.equal(matchesClassifiedFilters(invoice, { ...base, documentType: "RECEIPT" }), false);
  assert.equal(matchesClassifiedFilters(receipt, { ...base, documentType: "RECEIPT" }), true);
  assert.equal(matchesClassifiedFilters(unknown, { ...base, documentType: "UNKNOWN" }), true);
  assert.equal(matchesClassifiedFilters(unknown, { ...base, documentType: "INVOICE" }), false);
  assert.equal(matchesPendingFilters(photo({ accountId: null, documentType: "RECEIPT" }), { ...base, documentType: "RECEIPT" }), true);
  assert.equal(matchesPendingFilters(photo({ accountId: null, documentType: "INVOICE" }), { ...base, documentType: "RECEIPT" }), false);
  assert.equal(matchesSearch(receipt, "קבלה"), true);
  assert.equal(matchesSearch(invoice, "קבלה"), false);
});
