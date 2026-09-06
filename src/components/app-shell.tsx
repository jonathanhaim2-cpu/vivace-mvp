"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  Home,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { RoleSwitcher } from "@/components/role-switcher";
import { COMPANY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

const NAV = [
  { href: "/", label: "בית", icon: Home },
  { href: "/orders", label: "רכש", icon: ShoppingCart },
  { href: "/suppliers", label: "ספקים", icon: Truck },
  { href: "/receipts", label: "קליטת סחורה", icon: ClipboardCheck },
  { href: "/invoices", label: "חשבוניות", icon: FileText },
];

type Branch = { id: string; name: string };

export function AppShell({
  children,
  role,
  branchId,
  branches,
}: {
  children: React.ReactNode;
  role: Role;
  branchId: string | null;
  branches: Branch[];
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="font-heading text-lg font-semibold tracking-tight">{COMPANY.name}</p>
          <p className="text-sm text-sidebar-foreground/70">{COMPANY.nameHe} · עוסק מורשה {COMPANY.taxId}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs leading-5 text-sidebar-foreground/65">
          <p>בעלים: {COMPANY.owner}</p>
          <p>מנהל מוצר: {COMPANY.productOwner}</p>
          <p className="mt-2">MVP רכש · ללא מתכונים / Tabit</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b bg-sidebar text-sidebar-foreground lg:ms-64">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="lg:hidden">
            <p className="font-heading text-base font-semibold">{COMPANY.name}</p>
            <p className="text-[11px] text-sidebar-foreground/70">רכש ומלאי לסניפים</p>
          </div>
          <div className="hidden text-sm text-sidebar-foreground/80 lg:block">
            {role === "network" ? "תצוגת משרד הרשת" : "תצוגת מנהל סניף"}
          </div>
          <RoleSwitcher role={role} branchId={branchId} branches={branches} />
        </div>
      </header>

      <main className="lg:ms-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 lg:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px]",
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
    </div>
  );
}
