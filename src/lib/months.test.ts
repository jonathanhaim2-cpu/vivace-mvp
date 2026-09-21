import assert from "node:assert/strict";
import test from "node:test";
import { monthKeyFromInvoiceDate, parseMonthParam, resolvedPeriodMonth } from "./months";

test("monthKeyFromInvoiceDate reads YYYY-MM-DD", () => {
  assert.equal(monthKeyFromInvoiceDate("2026-08-17"), "2026-08");
});

test("monthKeyFromInvoiceDate reads YYYY-MM and ISO datetime prefixes", () => {
  assert.equal(monthKeyFromInvoiceDate("2026-09"), "2026-09");
  assert.equal(monthKeyFromInvoiceDate("2026-09-16T12:00:00Z"), "2026-09");
});

test("monthKeyFromInvoiceDate rejects empty and invalid months", () => {
  assert.equal(monthKeyFromInvoiceDate(null), null);
  assert.equal(monthKeyFromInvoiceDate(""), null);
  assert.equal(monthKeyFromInvoiceDate("17/08/2026"), null);
  assert.equal(monthKeyFromInvoiceDate("2026-13-01"), null);
});

test("resolvedPeriodMonth prefers an explicit batch override", () => {
  assert.equal(resolvedPeriodMonth("2026-09", "2026-08-03"), "2026-09");
  assert.equal(resolvedPeriodMonth("2026-09", null), "2026-09");
});

test("resolvedPeriodMonth falls back to the invoice date when override is empty", () => {
  assert.equal(resolvedPeriodMonth("", "2026-08-03"), "2026-08");
  assert.equal(resolvedPeriodMonth(null, "2026-08-03"), "2026-08");
  assert.equal(resolvedPeriodMonth("  ", null), null);
});

test("parseMonthParam treats all as no filter and invalid as fallback", () => {
  assert.equal(parseMonthParam("all", "2026-09"), null);
  assert.equal(parseMonthParam("2026-08", "2026-09"), "2026-08");
  assert.equal(parseMonthParam("nope", "2026-09"), "2026-09");
});

test("monthRangeUtc uses Jerusalem midnight so early-month Israel receipts stay in September", async () => {
  const { monthRangeUtc } = await import("./months");
  const { start, end } = monthRangeUtc("2026-09");
  // 2026-09-01 00:00 Asia/Jerusalem = 2026-08-31 21:00 UTC (IDT, UTC+3)
  assert.equal(start.toISOString(), "2026-08-31T21:00:00.000Z");
  assert.equal(end.toISOString(), "2026-09-30T21:00:00.000Z");
});
