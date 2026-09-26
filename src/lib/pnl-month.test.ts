import assert from "node:assert/strict";
import test from "node:test";
import { invoiceInPnlPeriod, pnlMonthKey } from "./pnl-month";

test("P&L uses the invoice date even when periodMonth was forced to September", () => {
  const month = pnlMonthKey({
    invoiceDate: "2026-08-14",
    documentDate: "2026-09-01",
    createdAt: new Date("2026-09-20T12:00:00Z"),
  });
  assert.equal(month, "2026-08");
  assert.equal(invoiceInPnlPeriod(month, "2026-09"), false);
  assert.equal(invoiceInPnlPeriod(month, "2026-08"), true);
});

test("P&L falls back to the document date only when the invoice date is missing", () => {
  assert.equal(
    pnlMonthKey({ invoiceDate: null, documentDate: "2026-07-02", createdAt: new Date("2026-09-01T00:00:00Z") }),
    "2026-07",
  );
  assert.equal(
    pnlMonthKey({ invoiceDate: "not-a-date", documentDate: "2026-06", createdAt: new Date("2026-09-01T00:00:00Z") }),
    "2026-06",
  );
});

test("P&L falls back to the created date when no invoice or document date exists", () => {
  const month = pnlMonthKey({
    invoiceDate: "",
    documentDate: null,
    createdAt: new Date("2026-03-15T10:00:00Z"),
  });
  assert.equal(month, "2026-03");
});

test("monthly P&L keeps a single month and the annual view aggregates that year", () => {
  assert.equal(invoiceInPnlPeriod("2026-01", "2026-01"), true);
  assert.equal(invoiceInPnlPeriod("2026-02", "2026-01"), false);
  assert.equal(invoiceInPnlPeriod("2026-11", "2026"), true);
  assert.equal(invoiceInPnlPeriod("2025-11", "2026"), false);
  assert.equal(invoiceInPnlPeriod("2026-09", null), true);
});
