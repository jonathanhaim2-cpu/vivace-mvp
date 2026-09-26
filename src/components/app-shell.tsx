"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  History,
  Home,
  Landmark,
  LayoutGrid,
  LogOut,
  Plus,
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
import { MobileChrome } from "@/components/mobile/mobile-chrome";
import { SessionSwitcher } from "@/components/session-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { COMPANY } from "@/lib/constants";
import { hasPermission, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { SendToSuppliersToggle } from "@/components/orders/send-to-suppliers-toggle";
import { APP_NAV, navPathActive, visibleAppNav } from "@/lib/app-nav";
import { MOBILE_NAV_ITEMS } from "@/lib/mobile-nav";
import type { DueCutoffReminder } from "@/lib/reminders";
import type { ChatPanelState } from "@/lib/chat-types";

const NAV_ICONS = {
  home: Home,
  purchasing: ClipboardCheck,
  suppliers: Truck,
  accounting: Landmark,
  inventory: Warehouse,
  foodcost: UtensilsCrossed,
  reports: BarChart3,
} as const;

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
  exceptionCount = 0,
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
  exceptionCount?: number;
}) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const items = visibleAppNav(permissions);
  const canSettings = hasPermission(permissions, "nav.settings");
  const canActivity = hasPermission(permissions, "nav.activity");
  const canUsers = hasPermission(permissions, "action.manage_users");
  const canToggleSend = hasPermission(permissions, "action.toggle_send_to_suppliers");
  const canChat = hasPermission(permissions, "nav.chat");
  const allowNetwork = appRole === "admin" || appRole === "accounting";
  const branchLabel = branchId
    ? (branches.find((branch) => branch.id === branchId)?.name ?? "סניף")
    : allowNetwork
      ? "משרד רשת"
      : (branches[0]?.name ?? "אין סניף");

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
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => {
            const childActive = item.children?.some((child) => navPathActive(child.href, pathname)) ?? false;
            const active = childActive || navPathActive(item.href, pathname);
            const Icon = NAV_ICONS[item.id as keyof typeof NAV_ICONS] ?? Home;
            return (
              <div key={item.id}>
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
                {item.children ? (
                  <div className="mt-1 ms-6 flex flex-col gap-0.5">
                    {item.children.map((sub) => {
                      const subActive = navPathActive(sub.href, pathname);
                      return (
                        <Link
                          key={`${item.id}-${sub.href}`}
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
        <MobileChrome
          userName={userName}
          appRole={appRole}
          branchId={branchId}
          branchLabel={branchLabel}
          branches={branches}
          allowNetwork={allowNetwork}
          exceptionCount={exceptionCount}
          authEnabled={authEnabled}
          canSettings={canSettings}
          canActivity={canActivity}
          canUsers={canUsers}
          canToggleSend={canToggleSend}
          canChat={canChat}
          sendToSuppliers={sendToSuppliers}
          onOpenChat={() => setChatOpen(true)}
        />
        <div className="hidden flex-wrap items-center gap-2 px-3 py-2 lg:flex">
          <div className="text-sm text-muted-foreground">
            הזמנות לספק · רכש שהתקבל
          </div>
          <div className="ms-auto flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-1">
            {appRole && userName ? (
              <SessionSwitcher
                role={appRole}
                name={userName}
                branchId={branchId}
                branches={branches}
                allowNetwork={allowNetwork}
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
        <div className="w-full px-3 py-6 pb-[calc(7.75rem+env(safe-area-inset-bottom))] lg:px-4 lg:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 overflow-visible border-t border-border bg-background/95 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(42_31_28/0.05)] backdrop-blur-md print:hidden lg:hidden">
        <div className="relative grid h-16 grid-cols-5 items-end">
          {MOBILE_NAV_ITEMS.map((item) => {
            if (item.id === "new-order") {
              if (!hasPermission(permissions, "nav.orders")) {
                return <span key={item.id} />;
              }
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-label={item.label}
                  className="relative flex flex-col items-center justify-end"
                >
                  <span className="absolute -top-7 left-1/2 z-10 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                    <Plus className="size-7" strokeWidth={2.4} />
                  </span>
                  <span className="mt-8 text-[10px] font-semibold text-primary">{item.label}</span>
                </Link>
              );
            }
            const active =
              item.id === "orders"
                ? (pathname === "/orders" || pathname.startsWith("/orders/")) && !pathname.startsWith("/orders/new")
                : navPathActive(item.href, pathname);
            const Icon =
              item.id === "home" ? Home : item.id === "orders" ? ShoppingCart : item.id === "invoices" ? FileText : LayoutGrid;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 px-1 pb-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-[3.25rem] items-center justify-center rounded-full",
                    active && "bg-primary/15",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {canChat ? (
        <div className="print:hidden">
          <AppChat panel={chatPanel} aiAvailable={aiAvailable} open={chatOpen} onOpenChange={setChatOpen} />
        </div>
      ) : null}
    </div>
  );
}
