import assert from "node:assert/strict";
import test from "node:test";
import { parseProductRecords, parseProductRow } from "./import-products";

test("Zest Hebrew headers map name from תיאור", () => {
  const row = parseProductRow({
    מקט: "123",
    תיאור: "עגבניות שרי",
    מחיר: "12.5",
  });
  assert.ok(row);
  assert.equal(row?.name, "עגבניות שרי");
  assert.equal(row?.sku, "123");
  assert.equal(row?.agreedPrice, 12.5);
});

test("falls back to first Hebrew text column when headers are unnamed", () => {
  const row = parseProductRow({
    col_0: "8899",
    col_1: "חלב 3%",
    col_2: "8.9",
  });
  assert.ok(row);
  assert.equal(row?.name, "חלב 3%");
});

test("skips totals rows", () => {
  const rows = parseProductRecords([
    { שם: 'סה"כ', מחיר: "100" },
    { שם: "לחם", מחיר: "6" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "לחם");
});
