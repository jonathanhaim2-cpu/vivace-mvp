"use client";

import { setBranch } from "@/actions/session";
import { RoleChip } from "@/components/role-chip";
import type { AppRole } from "@/lib/roles";

type Branch = { id: string; name: string };

export function SessionSwitcher({
  role,
  name,
  branchId,
  branches,
}: {
  role: AppRole;
  name: string;
  branchId: string | null;
  branches: Branch[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <RoleChip role={role} name={name} />
      {branches.length > 1 ? (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">סניף פעיל</span>
          <select
            className="h-7 rounded-full border border-border bg-card px-2 text-xs text-foreground"
            value={branchId ?? ""}
            onChange={(event) => setBranch(event.target.value)}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      ) : branches[0] ? (
        <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground sm:inline">
          {branches[0].name}
        </span>
      ) : null}
    </div>
  );
}
