import assert from "node:assert/strict";
import test from "node:test";
import { chargeUnitPrice, monthSettlement, mutualApproval, transferAmount } from "./settlement";

test("inter-branch charge uses the franchisee price and books only after both sides approve", () => {
  assert.equal(chargeUnitPrice(12, 10), 12);
  assert.equal(chargeUnitPrice(12, 12), 12);
  assert.throws(() => chargeUnitPrice(10, 12));
  assert.equal(transferAmount(3, 12), 36);
  assert.equal(mutualApproval({ fromApproved: true, toApproved: false }), "PENDING");
  assert.equal(mutualApproval({ fromApproved: true, toApproved: true }), "APPROVED");
});

test("month-end settlement adds approved transfers and royalties, and ignores pending rows", () => {
  const result = monthSettlement({
    transfers: [
      { amountIls: 36, status: "APPROVED" },
      { amountIls: 100, status: "PENDING" },
      { amountIls: 4, status: "APPROVED" },
    ],
    royaltyBase: 1000,
    royaltyPercent: 5,
  });
  assert.equal(result.transfers, 40);
  assert.equal(result.royalty, 50);
  assert.equal(result.total, 90);
});
