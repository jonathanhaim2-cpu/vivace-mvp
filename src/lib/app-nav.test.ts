import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_LINKS } from "@/lib/report-links";
import { APP_NAV, navPathActive, visibleAppNav } from "@/lib/app-nav";

test("רכש lists new order, the orders list, receiving, and open credits", () => {
  const purchasing = APP_NAV.find((item) => item.id === "purchasing");
  assert.equal(purchasing?.label, "רכש");
  assert.deepEqual(
    purchasing?.children?.map((child) => child.label),
    ["הזמנה חדשה", "הזמנות", "קליטת סחורה", "זיכויים פתוחים"],
  );
  assert.deepEqual(
    purchasing?.children?.map((child) => child.href),
    ["/orders/new", "/orders", "/receiving", "/credits"],
  );
});

test("הנהלת חשבונות replaces כספים and keeps invoices, bookkeeping, and expenses", () => {
  assert.equal(APP_NAV.some((item) => item.label === "כספים"), false);
  const accounting = APP_NAV.find((item) => item.id === "accounting");
  assert.equal(accounting?.label, "הנהלת חשבונות");
  assert.equal(accounting?.href, "/ap");
  assert.deepEqual(
    accounting?.children?.map((child) => [child.label, child.href]),
    [
      ["חשבוניות", "/invoices"],
      ["הנהלת חשבונות", "/ap"],
      ["הוצאות קבועות / משתנות", "/expenses"],
    ],
  );
});

test("דוחות keeps the existing report links and grouped pages are not also top-level", () => {
  const reports = APP_NAV.find((item) => item.id === "reports");
  assert.deepEqual(
    reports?.children?.map((child) => child.href),
    REPORT_LINKS.map((link) => link.href),
  );
  const grouped = new Set(APP_NAV.flatMap((item) => item.children?.map((child) => child.href) ?? []));
  const loose = APP_NAV.filter((item) => !item.children && grouped.has(item.href));
  assert.deepEqual(loose, []);
  assert.deepEqual(
    APP_NAV.filter((item) => !item.children).map((item) => item.label),
    ["בית", "ספקים", "מלאי", "פודקוסט"],
  );
});

test("orders list highlight does not include the new-order flow", () => {
  assert.equal(navPathActive("/orders", "/orders/new"), false);
  assert.equal(navPathActive("/orders/new", "/orders/new"), true);
  assert.equal(navPathActive("/orders", "/orders/ord_1"), true);
});

test("a role without purchasing permission does not see the רכש group", () => {
  const visible = visibleAppNav(["nav.home", "nav.invoices"]);
  assert.equal(visible.some((item) => item.id === "purchasing"), false);
  const accounting = visible.find((item) => item.id === "accounting");
  assert.deepEqual(
    accounting?.children?.map((child) => child.href),
    ["/invoices"],
  );
});
