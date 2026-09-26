import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  canDeactivateOrDemote,
  defaultAllowedForRole,
  isNetworkRole,
  requiredPermissionForPath,
  resolveRolePermissions,
} from "./roles";
import {
  generateTemporaryPassword,
  normalizeUsername,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "./passwords";
import { createSessionToken, isValidSessionToken, parseSessionToken } from "./auth";

test("four roles exist with Hebrew-oriented defaults", () => {
  assert.deepEqual(APP_ROLES, ["admin", "accounting", "branch_manager", "edge_worker"]);
  assert.equal(isNetworkRole("admin"), true);
  assert.equal(isNetworkRole("accounting"), true);
  assert.equal(isNetworkRole("branch_manager"), false);
  assert.equal(defaultAllowedForRole("admin", "action.manage_users"), true);
  assert.equal(defaultAllowedForRole("admin", "action.cancel_goods_receipt"), true);
  assert.equal(defaultAllowedForRole("admin", "nav.activity"), true);
  assert.equal(defaultAllowedForRole("accounting", "nav.invoices"), true);
  assert.equal(defaultAllowedForRole("accounting", "nav.activity"), true);
  assert.equal(defaultAllowedForRole("accounting", "action.cancel_goods_receipt"), false);
  assert.equal(defaultAllowedForRole("accounting", "action.manage_users"), false);
  assert.equal(defaultAllowedForRole("branch_manager", "nav.orders"), true);
  assert.equal(defaultAllowedForRole("branch_manager", "action.edit_prices"), false);
  assert.equal(defaultAllowedForRole("branch_manager", "action.cancel_goods_receipt"), false);
  assert.equal(defaultAllowedForRole("branch_manager", "nav.activity"), false);
  assert.equal(defaultAllowedForRole("edge_worker", "action.create_orders"), true);
  assert.equal(defaultAllowedForRole("edge_worker", "nav.settings"), false);
});

test("admin core permissions stay locked even if matrix tries to revoke them", () => {
  const allowed = resolveRolePermissions("admin", [
    { key: "action.manage_users", allowed: false },
    { key: "nav.users", allowed: false },
    { key: "nav.foodcost", allowed: false },
    { key: "action.cancel_goods_receipt", allowed: false },
  ]);
  assert.equal(allowed.has("action.manage_users"), true);
  assert.equal(allowed.has("nav.users"), true);
  assert.equal(allowed.has("action.cancel_goods_receipt"), true);
  assert.equal(allowed.has("nav.foodcost"), false);
});

test("branch roles cannot keep network-only audit/cancel permissions", () => {
  const manager = resolveRolePermissions("branch_manager", [
    { key: "action.cancel_goods_receipt", allowed: true },
    { key: "nav.activity", allowed: true },
  ]);
  assert.equal(manager.has("action.cancel_goods_receipt"), false);
  assert.equal(manager.has("nav.activity"), false);
});

test("cannot deactivate or demote the last active admin", () => {
  assert.equal(
    canDeactivateOrDemote({
      role: "admin",
      currentlyActive: true,
      nextActive: false,
      nextRole: "admin",
      otherActiveAdmins: 0,
    }),
    false,
  );
  assert.equal(
    canDeactivateOrDemote({
      role: "admin",
      currentlyActive: true,
      nextRole: "edge_worker",
      nextActive: true,
      otherActiveAdmins: 0,
    }),
    false,
  );
  assert.equal(
    canDeactivateOrDemote({
      role: "admin",
      currentlyActive: true,
      nextActive: false,
      nextRole: "admin",
      otherActiveAdmins: 1,
    }),
    true,
  );
});

test("username is unique-style latin and display name is Hebrew-friendly", () => {
  assert.equal(normalizeUsername(" Jonathan "), "jonathan");
  assert.equal(validateUsername("jonathan"), null);
  assert.ok(validateUsername("יונתן"));
  assert.ok(validateUsername("a"));
  assert.equal(validateDisplayName("יונתן חיימוף"), null);
  assert.ok(validateDisplayName("א"));
});

test("temporary passwords are strong enough", () => {
  for (let i = 0; i < 20; i += 1) {
    const password = generateTemporaryPassword();
    assert.equal(validatePassword(password), null);
  }
  assert.ok(validatePassword("short"));
  assert.ok(validatePassword("allletters"));
  assert.ok(validatePassword("12345678"));
});

test("routes map to permission keys", () => {
  assert.equal(requiredPermissionForPath("/settings/users"), "action.manage_users");
  assert.equal(requiredPermissionForPath("/settings/permissions"), "action.manage_permissions");
  assert.equal(requiredPermissionForPath("/settings/activity"), "nav.activity");
  assert.equal(requiredPermissionForPath("/orders/new"), "nav.orders");
  assert.equal(requiredPermissionForPath("/receiving"), "nav.receipts");
  assert.equal(requiredPermissionForPath("/credits"), "nav.receipts");
  assert.equal(requiredPermissionForPath("/menu"), "nav.home");
  assert.equal(requiredPermissionForPath("/ap"), "nav.ap");
  assert.equal(requiredPermissionForPath("/expenses"), "nav.ap");
  assert.equal(requiredPermissionForPath("/reports/cashflow"), "nav.reports");
  assert.equal(requiredPermissionForPath("/invoices/mail"), "action.accounting_package");
  assert.equal(requiredPermissionForPath("/api/cron/invoice-mail"), null);
  assert.equal(requiredPermissionForPath("/api/cron/invoice-mail-historical"), null);
  assert.equal(requiredPermissionForPath("/login"), null);
  assert.equal(DEFAULT_ROLE_PERMISSIONS.edge_worker.includes("nav.ap"), false);
});

test("signed session token carries user id", () => {
  const prevSecret = process.env.AUTH_SECRET;
  const prevPassword = process.env.APP_PASSWORD;
  process.env.AUTH_SECRET = "test-secret-for-roles";
  process.env.APP_PASSWORD = "unused-for-this-test";
  try {
    const token = createSessionToken("user_abc");
    assert.deepEqual(parseSessionToken(token), { userId: "user_abc" });
    assert.equal(isValidSessionToken(token), true);
    assert.equal(parseSessionToken("v2.user_abc.9999999999.deadbeef"), null);
  } finally {
    if (prevSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prevSecret;
    if (prevPassword === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = prevPassword;
  }
});
