import assert from "node:assert/strict";
import test from "node:test";
import { monthKeyFromDate } from "./months";
import {
  invoicesFilterQuery,
  matchesClassifiedFilters,
  matchesPendingFilters,
  parseInvoiceFilters,
  photoDateKey,
  photoPeriodMonth,
  uniqueSupplierNames,
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
});

test("parseInvoiceFilters accepts all-months, date range, and classified status", () => {
  const filters = parseInvoiceFilters({
    month: "all",
    from: "2026-09-01",
    to: "2026-09-16",
    category: "acc_food_misc",
    status: "classified",
    q: "  245 ",
  });
  assert.equal(filters.month, "all");
  assert.equal(filters.from, "2026-09-01");
  assert.equal(filters.to, "2026-09-16");
  assert.equal(filters.category, "acc_food_misc");
  assert.equal(filters.status, "classified");
  assert.equal(filters.q, "245");
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

test("pending photos never appear in classified results and respect month/date", () => {
  const filters = parseInvoiceFilters({ month: "2026-09" });
  const pending = photo({ accountId: null });
  assert.equal(matchesClassifiedFilters(pending, filters), false);
  assert.equal(matchesPendingFilters(pending, filters), true);
  assert.equal(matchesPendingFilters(pending, { ...filters, status: "classified" }), false);
  assert.equal(matchesPendingFilters(pending, { ...filters, month: "2026-08" }), false);
  assert.equal(matchesPendingFilters(pending, { ...filters, category: "acc_food_produce" }), false);
  assert.equal(matchesPendingFilters(photo(), filters), false);
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
});
