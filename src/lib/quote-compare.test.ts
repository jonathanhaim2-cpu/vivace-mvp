import assert from "node:assert/strict";
import test from "node:test";
import { compareQuoteBasket, compareQuoteLine, matchQuoteName } from "./quote-compare";

test("quote line is cheaper or pricier against history and the basket impact is amount and percent", () => {
  const basket = compareQuoteBasket([
    { name: "קמח", offered: 8, monthlyQty: 10, monthAvg: 10, yearAvg: 9 },
    { name: "שמן", offered: 20, monthlyQty: 2, monthAvg: 16, yearAvg: 18 },
  ]);
  assert.equal(basket.lines[0].verdict, "cheaper");
  assert.equal(basket.lines[1].verdict, "pricier");
  assert.equal(basket.lines[0].monthImpact, -20);
  assert.equal(basket.lines[1].monthImpact, 8);
  assert.equal(basket.monthImpact, -12);
  assert.equal(basket.lines[0].yearImpact, (8 - 9) * 10 * 12);
  assert.equal(basket.lines[1].yearImpact, (20 - 18) * 2 * 12);
  const monthBase = 10 * 10 + 16 * 2;
  assert.equal(basket.monthPercent, (-12 / monthBase) * 100);
  assert.equal(compareQuoteLine({ name: "x", offered: 5, monthlyQty: 1, monthAvg: null, yearAvg: null }).verdict, "unknown");
});

test("quote item matches one catalog product and stays unset when several fit", () => {
  const catalog = [
    { id: "a", name: "קמח מלא" },
    { id: "b", name: "קמח לבן" },
    { id: "c", name: "שמן זית" },
  ];
  assert.equal(matchQuoteName("שמן זית", catalog), "c");
  assert.equal(matchQuoteName("קמח", catalog), null);
  assert.equal(matchQuoteName("", catalog), null);
});
