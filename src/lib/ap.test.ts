import assert from "node:assert/strict";
import test from "node:test";
import { payMethodLabel } from "./ap";

test("payMethodLabel maps CARD_2 as אשראי · כרטיס 2", () => {
  assert.equal(payMethodLabel("TRANSFER"), "העברה בנקאית");
  assert.equal(payMethodLabel("CARD"), "אשראי · כרטיס 1");
  assert.equal(payMethodLabel("CARD_2"), "אשראי · כרטיס 2");
  assert.equal(payMethodLabel(null), "—");
});
