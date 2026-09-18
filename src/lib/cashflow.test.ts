import assert from "node:assert/strict";
import test from "node:test";
import { PAYMENT_METHODS } from "./constants";

test("CARD and CARD_2 remain distinct payment methods", () => {
  assert.equal(PAYMENT_METHODS.some((item) => item.value === "CARD"), true);
  assert.equal(PAYMENT_METHODS.some((item) => item.value === "CARD_2"), true);
});
