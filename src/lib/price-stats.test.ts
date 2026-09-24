import assert from "node:assert/strict";
import test from "node:test";
import { annualAveragePrice, dishCostFromPrices, lastPurchasePrice, priceGap } from "./price-stats";

const points = [
  { at: "2026-01-10", qty: 2, unitPrice: 10 },
  { at: "2026-06-01", qty: 2, unitPrice: 20 },
  { at: "2025-12-01", qty: 5, unitPrice: 4 },
  { at: "2026-03-01", qty: 0, unitPrice: 99 },
];

test("last purchase price is the newest positive receipt, annual average is qty-weighted for that year", () => {
  assert.equal(lastPurchasePrice(points), 20);
  assert.equal(annualAveragePrice(points, 2026), 15);
  assert.equal(annualAveragePrice(points, 2024), null);
  assert.equal(lastPurchasePrice([]), null);
});

test("gap direction and size compare last price to the annual average", () => {
  const up = priceGap(20, 15);
  assert.equal(up?.direction, "up");
  assert.ok(Math.abs((up?.percent ?? 0) - (5 / 15) * 100) < 1e-9);
  assert.equal(priceGap(10, 15)?.direction, "down");
  assert.equal(priceGap(15, 15)?.direction, "flat");
  assert.equal(priceGap(null, 15), null);
});

test("recipe cost uses the price map for each component", () => {
  const prices = new Map<string, number | null>([
    ["flour", 10],
    ["tomato", 4],
  ]);
  const result = dishCostFromPrices(
    [
      { productId: "flour", qty: 0.5 },
      { productId: "tomato", qty: 2 },
      { productId: null, qty: 1 },
    ],
    prices,
  );
  assert.equal(result.cost, 13);
  assert.equal(result.missing, false);
});
