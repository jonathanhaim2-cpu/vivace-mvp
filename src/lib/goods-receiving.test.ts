import assert from "node:assert/strict";
import test from "node:test";
import { ORDER_STATUSES } from "./constants";
import { isAwaitingGoodsReceiving } from "./goods-receiving";

test("goods receiving lists only open, not-yet-received orders from orderable suppliers", () => {
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.SENT,
      hasReceipt: false,
      supplierIsOrderable: true,
    }),
    true,
  );
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.CONFIRMED,
      hasReceipt: false,
      supplierIsOrderable: true,
    }),
    true,
  );
});

test("received orders leave the goods-receiving list", () => {
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.RECEIVED,
      hasReceipt: true,
      supplierIsOrderable: true,
    }),
    false,
  );
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.SENT,
      hasReceipt: true,
      supplierIsOrderable: true,
    }),
    false,
  );
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.PARTIAL,
      hasReceipt: false,
      supplierIsOrderable: true,
    }),
    false,
  );
});

test("utilities and other non-orderable suppliers stay off the goods-receiving list", () => {
  assert.equal(
    isAwaitingGoodsReceiving({
      status: ORDER_STATUSES.SENT,
      hasReceipt: false,
      supplierIsOrderable: false,
    }),
    false,
  );
});
