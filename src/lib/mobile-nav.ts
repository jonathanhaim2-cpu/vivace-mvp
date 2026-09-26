/** Mobile bottom nav, right-to-left. Index 0 is the visual right edge in RTL. */
export const MOBILE_NAV_ITEMS = [
  { id: "home", href: "/", label: "בית" },
  { id: "orders", href: "/orders", label: "הזמנות" },
  { id: "new-order", href: "/orders/new", label: "הזמנה חדשה" },
  { id: "invoices", href: "/invoices", label: "חשבוניות" },
  { id: "menu", href: "/menu", label: "תפריט" },
] as const;

export type MobileNavId = (typeof MOBILE_NAV_ITEMS)[number]["id"];

export function mobileNavLabels() {
  return MOBILE_NAV_ITEMS.map((item) => item.label);
}

/** Items sitting on each side of the central new-order button. */
export function mobileNavSideCounts(items: readonly { id: string }[] = MOBILE_NAV_ITEMS) {
  const center = items.findIndex((item) => item.id === "new-order");
  return {
    center,
    before: center,
    after: center < 0 ? 0 : items.length - center - 1,
  };
}

export function userInitials(name: string | null | undefined) {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "•";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`;
  }
  return [...trimmed].slice(0, 2).join("");
}

/** Header bell: one row per open credit, one aggregate row when mail approvals wait, plus each missing-invoice alert. */
export function shellExceptionCount(input: {
  credits: number;
  pendingApproval: number;
  missingInvoices: number;
}) {
  return input.credits + (input.pendingApproval > 0 ? 1 : 0) + input.missingInvoices;
}
