import assert from "node:assert/strict";
import test from "node:test";
import { suggestOrderStandard } from "./order-standards";

test("suggests per-cycle standard from start + orders - end", () => {
  const result = suggestOrderStandard({
    startQty: 10,
    orderedQty: 20,
    endQty: 6,
    wasteQty: 1,
    deliveryDays: [0, 3],
    periodDays: 28,
    currentStandard: 4,
  });
  assert.equal(result.consumption, 24);
  assert.ok(result.suggested > 0);
});

test("falls back to current standard when consumption is zero", () => {
  const result = suggestOrderStandard({
    startQty: 5,
    orderedQty: 0,
    endQty: 5,
    wasteQty: 0,
    deliveryDays: [1],
    periodDays: 30,
    currentStandard: 8,
  });
  assert.equal(result.suggested, 8);
});
