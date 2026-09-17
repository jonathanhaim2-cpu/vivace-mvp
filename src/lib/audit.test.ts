import assert from "node:assert/strict";
import test from "node:test";
import {
  AUDIT_ACTIONS,
  actorFromSession,
  auditActionLabel,
  auditEntityHref,
  formatActorLabel,
  formatAuditStamp,
  isCancellableReceiptStatus,
} from "./audit";
import type { AppSession, SessionUser } from "./session";

function session(user: SessionUser | null): AppSession {
  return {
    user,
    appRole: user?.role ?? "admin",
    role: "network",
    isNetwork: true,
    branchId: null,
    branch: null,
    branches: [],
    permissions: [],
    authEnabled: true,
  };
}

test("formatActorLabel prefers name + username and falls back to unknown", () => {
  assert.equal(formatActorLabel("יונתן", "jonathan"), "יונתן (jonathan)");
  assert.equal(formatActorLabel("יונתן", "יונתן"), "יונתן");
  assert.equal(formatActorLabel(null, "jonathan"), "jonathan");
  assert.equal(formatActorLabel("", "unknown"), "לא ידוע");
  assert.equal(formatActorLabel(null, null), "לא ידוע");
});

test("formatAuditStamp uses Hebrew actor + time, or לא ידוע", () => {
  const stamp = formatAuditStamp({
    actorName: "יונתן",
    actorUsername: "jonathan",
    createdAt: new Date("2026-09-17T08:30:00.000Z"),
  });
  assert.match(stamp, /^בוצע ע״י יונתן \(jonathan\) · /);
  assert.equal(formatAuditStamp(null), "לא ידוע");
  assert.equal(formatAuditStamp(undefined), "לא ידוע");
});

test("actorFromSession copies live session identity", () => {
  const actor = actorFromSession(
    session({
      id: "user_1",
      name: "יונתן",
      username: "jonathan",
      role: "admin",
      active: true,
    }),
  );
  assert.deepEqual(actor, {
    actorUserId: "user_1",
    actorUsername: "jonathan",
    actorName: "יונתן",
  });
  const missing = actorFromSession(session(null));
  assert.equal(missing.actorUserId, null);
  assert.equal(missing.actorName, "לא ידוע");
  assert.equal(missing.actorUsername, "unknown");
});

test("approved / credit / pending price receipts can be cancelled", () => {
  assert.equal(isCancellableReceiptStatus("APPROVED"), true);
  assert.equal(isCancellableReceiptStatus("CREDIT_NEEDED"), true);
  assert.equal(isCancellableReceiptStatus("PENDING_PRICE_APPROVAL"), true);
  assert.equal(isCancellableReceiptStatus("SUBMITTED"), true);
  assert.equal(isCancellableReceiptStatus("VOID"), false);
});

test("cancelled receipt links back to the order when meta has orderId", () => {
  assert.equal(
    auditEntityHref({
      action: AUDIT_ACTIONS.RECEIPT_CANCEL,
      entityType: "GoodsReceipt",
      entityId: "gr_1",
      meta: { orderId: "ord_9" },
    }),
    "/orders/ord_9",
  );
  assert.equal(
    auditEntityHref({
      action: AUDIT_ACTIONS.RECEIPT_SUBMIT,
      entityType: "GoodsReceipt",
      entityId: "gr_1",
    }),
    "/receipts/gr_1",
  );
  assert.equal(auditActionLabel(AUDIT_ACTIONS.RECEIPT_CANCEL), "ביטול קליטה");
});
