export const APP_ROLES = ["admin", "accounting", "branch_manager", "edge_worker"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "אדמין",
  accounting: "הנהלת חשבונות",
  branch_manager: "מנהל סניף",
  edge_worker: "עובד קצה",
};

export const PERMISSION_GROUPS = ["תצוגה", "פעולות"] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export const PERMISSIONS = [
  { key: "nav.home", label: "בית", group: "תצוגה" },
  { key: "nav.orders", label: "רכש", group: "תצוגה" },
  { key: "nav.suppliers", label: "ספקים", group: "תצוגה" },
  { key: "nav.receipts", label: "קליטה", group: "תצוגה" },
  { key: "nav.invoices", label: "חשבוניות", group: "תצוגה" },
  { key: "nav.inventory", label: "מלאי", group: "תצוגה" },
  { key: "nav.foodcost", label: "Food Cost", group: "תצוגה" },
  { key: "nav.reports", label: "דוחות", group: "תצוגה" },
  { key: "nav.ap", label: "תשלומים לספקים", group: "תצוגה" },
  { key: "nav.settings", label: "הגדרות", group: "תצוגה" },
  { key: "nav.chat", label: "צ׳אט AI", group: "תצוגה" },
  { key: "nav.users", label: "משתמשים", group: "תצוגה" },
  { key: "nav.permissions", label: "הרשאות", group: "תצוגה" },
  { key: "action.create_orders", label: "יצירת הזמנות", group: "פעולות" },
  { key: "action.send_whatsapp", label: "שליחת הזמנות בוואטסאפ", group: "פעולות" },
  { key: "action.goods_intake", label: "קליטת סחורה", group: "פעולות" },
  { key: "action.edit_inventory", label: "עריכת מלאי", group: "פעולות" },
  { key: "action.edit_suppliers", label: "עריכת ספקים", group: "פעולות" },
  { key: "action.edit_prices", label: "עריכת מחירים", group: "פעולות" },
  { key: "action.approve_credits", label: "אישור זיכויים", group: "פעולות" },
  { key: "action.accounting_package", label: "חבילת הנה״ח", group: "פעולות" },
  { key: "action.toggle_send_to_suppliers", label: "החלפת שליחה לספקים", group: "פעולות" },
  { key: "action.manage_settings", label: "עריכת הגדרות מערכת", group: "פעולות" },
  { key: "action.manage_users", label: "ניהול משתמשים", group: "פעולות" },
  { key: "action.manage_permissions", label: "ניהול הרשאות", group: "פעולות" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((item) => item.key) as PermissionKey[];

export const LOCKED_ADMIN_PERMISSIONS: PermissionKey[] = [
  "nav.home",
  "nav.settings",
  "nav.users",
  "nav.permissions",
  "action.manage_users",
  "action.manage_permissions",
];

const ACCOUNTING_KEYS: PermissionKey[] = [
  "nav.home",
  "nav.receipts",
  "nav.invoices",
  "nav.reports",
  "nav.ap",
  "nav.chat",
  "action.approve_credits",
  "action.accounting_package",
];

const BRANCH_MANAGER_KEYS: PermissionKey[] = [
  "nav.home",
  "nav.orders",
  "nav.suppliers",
  "nav.receipts",
  "nav.inventory",
  "nav.chat",
  "action.create_orders",
  "action.send_whatsapp",
  "action.goods_intake",
  "action.edit_inventory",
];

const EDGE_WORKER_KEYS: PermissionKey[] = [
  "nav.home",
  "nav.orders",
  "nav.receipts",
  "action.create_orders",
  "action.send_whatsapp",
  "action.goods_intake",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  accounting: ACCOUNTING_KEYS,
  branch_manager: BRANCH_MANAGER_KEYS,
  edge_worker: EDGE_WORKER_KEYS,
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function parseAppRole(value: string | null | undefined): AppRole | null {
  return isAppRole(value) ? value : null;
}

export function appRoleLabel(role: string | null | undefined) {
  return isAppRole(role) ? APP_ROLE_LABELS[role] : "משתמש";
}

export function isNetworkRole(role: AppRole | null | undefined) {
  return role === "admin" || role === "accounting";
}

export function isBranchScopedRole(role: AppRole | null | undefined) {
  return role === "branch_manager" || role === "edge_worker";
}

export function defaultAllowedForRole(role: AppRole, key: PermissionKey) {
  return DEFAULT_ROLE_PERMISSIONS[role].includes(key);
}

export function resolveRolePermissions(
  role: AppRole,
  stored: Iterable<{ key: string; allowed: boolean }>,
) {
  const allowed = new Set<PermissionKey>(DEFAULT_ROLE_PERMISSIONS[role]);
  const known = new Set<string>(PERMISSION_KEYS);
  for (const row of stored) {
    if (!known.has(row.key)) continue;
    if (row.allowed) allowed.add(row.key as PermissionKey);
    else allowed.delete(row.key as PermissionKey);
  }
  if (role === "admin") {
    for (const key of LOCKED_ADMIN_PERMISSIONS) allowed.add(key);
  }
  return allowed;
}

export function hasPermission(permissions: readonly string[], key: string) {
  return permissions.includes(key);
}

export function isLockedAdminPermission(role: string, key: string) {
  return role === "admin" && LOCKED_ADMIN_PERMISSIONS.includes(key as PermissionKey);
}

export function canDeactivateOrDemote(input: {
  role: string;
  currentlyActive: boolean;
  nextActive: boolean;
  nextRole: string;
  otherActiveAdmins: number;
}) {
  const staysAdmin = input.nextRole === "admin" && input.nextActive;
  if (input.role === "admin" && input.currentlyActive && !staysAdmin && input.otherActiveAdmins <= 0) {
    return false;
  }
  return true;
}

const PATH_RULES: { prefix: string; key: PermissionKey }[] = [
  { prefix: "/settings/users", key: "action.manage_users" },
  { prefix: "/settings/permissions", key: "action.manage_permissions" },
  { prefix: "/settings", key: "nav.settings" },
  { prefix: "/categories", key: "nav.settings" },
  { prefix: "/ap", key: "nav.ap" },
  { prefix: "/invoices/package", key: "action.accounting_package" },
  { prefix: "/invoices/mail", key: "action.accounting_package" },
  { prefix: "/invoices", key: "nav.invoices" },
  { prefix: "/orders", key: "nav.orders" },
  { prefix: "/suppliers", key: "nav.suppliers" },
  { prefix: "/products", key: "nav.suppliers" },
  { prefix: "/receipts", key: "nav.receipts" },
  { prefix: "/inventory", key: "nav.inventory" },
  { prefix: "/waste", key: "nav.inventory" },
  { prefix: "/foodcost", key: "nav.foodcost" },
  { prefix: "/reports", key: "nav.reports" },
  { prefix: "/anomalies", key: "nav.reports" },
];

export function requiredPermissionForPath(pathname: string): PermissionKey | null {
  const path = pathname.split("?")[0] || "/";
  if (
    path === "/login" ||
    path === "/forbidden" ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/brand/") ||
    path.startsWith("/uploads/")
  ) {
    return null;
  }
  for (const rule of PATH_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) return rule.key;
  }
  return "nav.home";
}
