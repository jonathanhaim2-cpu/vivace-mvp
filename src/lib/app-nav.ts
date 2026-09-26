import { REPORT_LINKS } from "@/lib/report-links";
import { hasPermission, type PermissionKey } from "@/lib/roles";

export type AppNavChild = { href: string; label: string; permission: PermissionKey };
export type AppNavItem = {
  id: string;
  href: string;
  label: string;
  permission: PermissionKey;
  children?: AppNavChild[];
};

/** Shared by the desktop sidebar and the mobile תפריט page. */
export const APP_NAV: AppNavItem[] = [
  { id: "home", href: "/", label: "בית", permission: "nav.home" },
  {
    id: "purchasing",
    href: "/orders",
    label: "רכש",
    permission: "nav.orders",
    children: [
      { href: "/orders/new", label: "הזמנה חדשה", permission: "nav.orders" },
      { href: "/orders", label: "הזמנות", permission: "nav.orders" },
      { href: "/receiving", label: "קליטת סחורה", permission: "nav.receipts" },
      { href: "/credits", label: "זיכויים פתוחים", permission: "nav.receipts" },
    ],
  },
  { id: "suppliers", href: "/suppliers", label: "ספקים", permission: "nav.suppliers" },
  {
    id: "accounting",
    href: "/ap",
    label: "הנהלת חשבונות",
    permission: "nav.invoices",
    children: [
      { href: "/invoices", label: "חשבוניות", permission: "nav.invoices" },
      { href: "/ap", label: "הנהלת חשבונות", permission: "nav.ap" },
      { href: "/expenses", label: "הוצאות קבועות / משתנות", permission: "nav.ap" },
    ],
  },
  { id: "inventory", href: "/inventory", label: "מלאי", permission: "nav.inventory" },
  { id: "foodcost", href: "/foodcost", label: "פודקוסט", permission: "nav.foodcost" },
  {
    id: "reports",
    href: "/reports",
    label: "דוחות",
    permission: "nav.reports",
    children: REPORT_LINKS.map((link) => ({ href: link.href, label: link.label, permission: "nav.reports" as PermissionKey })),
  },
];

export function visibleAppNav(permissions: readonly string[], items: readonly AppNavItem[] = APP_NAV) {
  return items.flatMap((item) => {
    const children = item.children?.filter((child) => hasPermission(permissions, child.permission));
    const self = hasPermission(permissions, item.permission);
    if (children && children.length > 0) return [{ ...item, children }];
    if (self && !item.children) return [item];
    if (self) return [{ ...item, children: undefined }];
    return [];
  });
}

/** True when this nav href is the current page. `/orders` does not swallow `/orders/new`. */
export function navPathActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/reports") return pathname === "/reports";
  if (href === "/orders") {
    return pathname === "/orders" || (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/new"));
  }
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
