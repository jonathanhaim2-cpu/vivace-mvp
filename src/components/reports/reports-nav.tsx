"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const REPORT_LINKS = [
  { href: "/reports", label: "רוו״ה" },
  { href: "/reports/food-cost", label: "עלות רכש" },
  { href: "/reports/ap", label: "תשלום לספק" },
  { href: "/reports/cashflow", label: "תזרים" },
  { href: "/reports/delivery-notes", label: "תעודות משלוח" },
] as const;

export function ReportsNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-4 flex flex-wrap gap-1.5">
      {REPORT_LINKS.map((item) => {
        const active = item.href === "/reports" ? pathname === "/reports" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
