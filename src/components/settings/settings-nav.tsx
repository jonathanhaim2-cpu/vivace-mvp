"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, type PermissionKey } from "@/lib/roles";

export function SettingsNav({ permissions }: { permissions: readonly string[] }) {
  const pathname = usePathname();
  const items = [
    { href: "/settings", label: "כללי", match: "exact", key: "nav.settings" as PermissionKey },
    { href: "/settings/users", label: "משתמשים", match: "prefix", key: "action.manage_users" as PermissionKey },
    {
      href: "/settings/permissions",
      label: "הרשאות",
      match: "prefix",
      key: "action.manage_permissions" as PermissionKey,
    },
    { href: "/settings/activity", label: "פעילות", match: "prefix", key: "nav.activity" as PermissionKey },
  ].filter((item) => hasPermission(permissions, item.key));

  if (items.length === 0) return null;

  return (
    <div className="mb-3 inline-flex flex-wrap rounded-full border border-border bg-card p-0.5">
      {items.map((item) => {
        const active =
          item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
