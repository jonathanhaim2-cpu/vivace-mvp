import assert from "node:assert/strict";
import test from "node:test";
import { MOBILE_NAV_ITEMS, mobileNavLabels, mobileNavSideCounts, shellExceptionCount, userInitials } from "./mobile-nav";

test("mobile nav order is בית, הזמנות, הזמנה חדשה, חשבוניות, תפריט from right to left", () => {
  assert.deepEqual(mobileNavLabels(), ["בית", "הזמנות", "הזמנה חדשה", "חשבוניות", "תפריט"]);
  assert.equal(MOBILE_NAV_ITEMS[3]?.href, "/invoices");
  assert.equal((mobileNavLabels() as string[]).includes("מסמכים"), false);
});

test("mobile nav keeps two equal items on each side of the central button", () => {
  const sides = mobileNavSideCounts();
  assert.equal(sides.center, 2);
  assert.equal(sides.before, 2);
  assert.equal(sides.after, 2);
  assert.equal(MOBILE_NAV_ITEMS[sides.center]?.id, "new-order");
  assert.equal(MOBILE_NAV_ITEMS[sides.center]?.href, "/orders/new");
});

test("user initials use the first two letters of a single Hebrew name", () => {
  assert.equal(userInitials("יהונתן"), "יה");
  assert.equal(userInitials("יונתן חיים"), "יח");
  assert.equal(userInitials("  "), "•");
  assert.equal(userInitials(null), "•");
});

test("shell exception count matches the home exception rows", () => {
  assert.equal(shellExceptionCount({ credits: 2, pendingApproval: 4, missingInvoices: 1 }), 4);
  assert.equal(shellExceptionCount({ credits: 0, pendingApproval: 0, missingInvoices: 0 }), 0);
  assert.equal(shellExceptionCount({ credits: 0, pendingApproval: 3, missingInvoices: 0 }), 1);
});
