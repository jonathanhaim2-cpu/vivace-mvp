"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  History,
  Home,
  Landmark,
  LogOut,
  Settings,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { AppChat } from "@/components/chat/app-chat";
import { CutoffReminderBanner } from "@/components/cutoff-reminder-banner";
import { SessionSwitcher } from "@/components/session-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { COMPANY } from "@/lib/constants";
import { hasPermission, type AppRole, type PermissionKey } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { REPORT_LINKS } from "@/components/reports/reports-nav";
import { SendToSuppliersToggle } from "@/components/orders/send-to-suppliers-toggle";
import type { DueCutoffReminder } from "@/lib/reminders";
import type { ChatPanelState } from "@/lib/chat-types";

const NAV: { href: string; label: string; icon: typeof Home; permission: PermissionKey }[] = [
  { href: "/", label: "בית", icon: Home, permission: "nav.home" },
  { href: "/orders", label: "הזמנות", icon: ShoppingCart, permission: "nav.orders" },
  { href: "/purchases", label: "רכש", icon: ClipboardCheck, permission: "nav.receipts" },
  { href: "/suppliers", label: "ספקים", icon: Truck, permission: "nav.suppliers" },
  { href: "/invoices", label: "חשבוניות", icon: FileText, permission: "nav.invoices" },
  { href: "/inventory", label: "מלאי", icon: Warehouse, permission: "nav.inventory" },
  { href: "/foodcost", label: "Food Cost", icon: UtensilsCrossed, permission: "nav.foodcost" },
  { href: "/reports", label: "דוחות", icon: BarChart3, permission: "nav.reports" },
  { href: "/ap", label: "תשלומים", icon: Landmark, permission: "nav.ap" },
];

type Branch = { id: string; name: string };

export function AppShell({
  children,
  appRole,
  userName,
  permissions,
  branchId,
  branches,
  authEnabled,
  aiAvailable,
  chatPanel,
  dueReminders = [],
  sendToSuppliers = false,
}: {
  children: React.ReactNode;
  appRole: AppRole | null;
  userName: string | null;
  permissions: string[];
  branchId: string | null;
  branches: Branch[];
  authEnabled: boolean;
  aiAvailable: boolean;
  chatPanel: ChatPanelState;
  dueReminders?: DueCutoffReminder[];
  sendToSuppliers?: boolean;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const items = NAV.filter((item) => hasPermission(permissions, item.permission));
  const canSettings = hasPermission(permissions, "nav.settings");
  const canActivity = hasPermission(permissions, "nav.activity");
  const canToggleSend = hasPermission(permissions, "action.toggle_send_to_suppliers");
  const canChat = hasPermission(permissions, "nav.chat");

  return (
    <div className="min-h-full bg-background">
      <aside
        data-app-sidebar
        className="fixed inset-y-0 start-0 z-30 hidden w-64 overflow-hidden flex-col bg-sidebar text-sidebar-foreground print:hidden lg:flex"
      >
        <div className="overflow-hidden border-b border-sidebar-border px-3 py-3">
          <Link href="/" className="block min-w-0 w-full overflow-hidden">
            <BrandLogo variant="wb" />
          </Link>
          <p className="mt-3 text-[11px] tracking-wide text-sidebar-foreground/55">
            {COMPANY.nameHe} · ע.מ {COMPANY.taxId}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
                {item.href === "/reports" && pathname.startsWith("/reports") ? (
                  <div className="mt-1 ms-6 flex flex-col gap-0.5">
                    {REPORT_LINKS.map((sub) => {
                      const subActive = sub.href === "/reports" ? pathname === "/reports" : pathname.startsWith(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "rounded-lg px-2 py-1 text-[11px]",
                            subActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70",
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs leading-5 text-sidebar-foreground/65">
          <p>בעלים: {COMPANY.owner}</p>
          <p>מנהל מוצר: {COMPANY.productOwner}</p>
          <a
            href={COMPANY.website}
            className="mt-2 inline-block text-sidebar-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            vivace-pizza.com
          </a>
        </div>
      </aside>

      <header className="sticky top-0 z-20 overflow-x-hidden border-b border-border bg-background/90 text-foreground backdrop-blur-md print:hidden lg:ms-64">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="min-w-0 max-w-[42%] lg:hidden">
            <Link href="/" className="block min-w-0 max-w-full">
              <BrandLogo variant="auto" compact />
            </Link>
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">
            הזמנות לספק · רכש שהתקבל
          </div>
          <div className="ms-auto flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-1">
            {appRole && userName ? (
              <SessionSwitcher
                role={appRole}
                name={userName}
                branchId={branchId}
                branches={branches}
                allowNetwork={appRole === "admin" || appRole === "accounting"}
              />
            ) : null}
            {canToggleSend ? <SendToSuppliersToggle enabled={sendToSuppliers} compact /> : null}
            <ThemeToggle compact />
            {canActivity ? (
              <Link
                href="/settings/activity"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-muted",
                  pathname.startsWith("/settings/activity") && "bg-muted text-primary",
                )}
              >
                <History className="size-3.5" />
                פעילות
              </Link>
            ) : null}
            {canSettings ? (
              <Link
                href="/settings"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-muted",
                  pathname.startsWith("/settings") &&
                    !pathname.startsWith("/settings/activity") &&
                    "bg-muted text-primary",
                )}
              >
                <Settings className="size-3.5" />
                <span className="hidden sm:inline">הגדרות</span>
              </Link>
            ) : null}
            {authEnabled ? (
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">יציאה</span>
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <main className="lg:ms-64">
        <CutoffReminderBanner initial={dueReminders} />
        <div className="w-full px-3 py-6 pb-28 lg:px-4 lg:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md print:hidden lg:hidden">
        <div className="grid grid-cols-5">
          {(
            ["/", "/orders", "/purchases", "/invoices", "/reports"]
              .map((href) => items.find((item) => item.href === href))
              .filter((item) => item != null) as typeof items
          ).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {canChat ? (
        <div className="print:hidden">
          <AppChat panel={chatPanel} aiAvailable={aiAvailable} />
        </div>
      ) : null}
    </div>
  );
}
