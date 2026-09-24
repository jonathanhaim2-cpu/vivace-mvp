import assert from "node:assert/strict";
import test from "node:test";
import { chargeDayFor, projectBalance } from "./cashflow-view";

test("without a card, billing day stays the supplier day or the card-method default", () => {
  assert.equal(chargeDayFor({ paymentChargeDay: null, paymentMethod: "CARD", cardBillingDay: null }), 15);
  assert.equal(chargeDayFor({ paymentChargeDay: 7, paymentMethod: "TRANSFER", cardBillingDay: null }), 7);
  assert.equal(chargeDayFor({ paymentChargeDay: 7, paymentMethod: "TRANSFER", cardBillingDay: 20 }), 20);
});

test("projected balance subtracts each day's outflow from the opening balance", () => {
  const series = projectBalance(1000, [
    { day: 1, amountIls: 100 },
    { day: 15, amountIls: 40 },
  ]);
  assert.deepEqual(series, [
    { day: 1, outflow: 100, balance: 900 },
    { day: 15, outflow: 40, balance: 860 },
  ]);
});
