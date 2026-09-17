"use client";

import { useOptimistic, useTransition } from "react";
import { restoreDefaultPermissions, setRolePermission } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import {
  APP_ROLES,
  APP_ROLE_LABELS,
  PERMISSION_GROUPS,
  PERMISSIONS,
  isLockedAdminPermission,
  type AppRole,
  type PermissionKey,
} from "@/lib/roles";

type Matrix = Record<AppRole, PermissionKey[]>;

export function PermissionMatrix({ initial }: { initial: Matrix }) {
  const [pending, start] = useTransition();
  const [matrix, setMatrix] = useOptimistic(initial);

  function toggle(role: AppRole, key: PermissionKey, next: boolean) {
    if (isLockedAdminPermission(role, key) && !next) return;
    start(async () => {
      setMatrix((current) => {
        const set = new Set(current[role]);
        if (next) set.add(key);
        else set.delete(key);
        return { ...current, [role]: [...set] };
      });
      await setRolePermission(role, key, next);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          סימון = התפקיד רואה או יכול לבצע. השינוי נשמר מיד, בלי פריסה מחדש.
        </p>
        <form action={restoreDefaultPermissions}>
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            שחזור ברירות מחדל
          </Button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky start-0 z-10 bg-muted/40 px-3 py-1.5 text-start font-medium">הרשאה</th>
              {APP_ROLES.map((role) => (
                <th key={role} className="px-2 py-2.5 text-center font-medium">
                  {APP_ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <GroupRows
                key={group}
                group={group}
                matrix={matrix}
                pending={pending}
                onToggle={toggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  group,
  matrix,
  pending,
  onToggle,
}: {
  group: (typeof PERMISSION_GROUPS)[number];
  matrix: Matrix;
  pending: boolean;
  onToggle: (role: AppRole, key: PermissionKey, next: boolean) => void;
}) {
  const rows = PERMISSIONS.filter((item) => item.group === group);
  return (
    <>
      <tr className="border-b bg-muted/20">
        <td colSpan={1 + APP_ROLES.length} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {group}
        </td>
      </tr>
      {rows.map((permission) => (
        <tr key={permission.key} className="border-b last:border-0 hover:bg-muted/30">
          <td className="sticky start-0 bg-card px-3 py-2">{permission.label}</td>
          {APP_ROLES.map((role) => {
            const checked = matrix[role]?.includes(permission.key) ?? false;
            const locked = isLockedAdminPermission(role, permission.key);
            return (
              <td key={role} className="px-2 py-2 text-center">
                <label className="inline-flex justify-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--brand-red)]"
                    checked={checked}
                    disabled={pending || locked}
                    aria-label={`${APP_ROLE_LABELS[role]} — ${permission.label}`}
                    onChange={(event) => onToggle(role, permission.key, event.target.checked)}
                  />
                </label>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
