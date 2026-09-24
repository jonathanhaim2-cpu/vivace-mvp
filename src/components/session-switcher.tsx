"use client";

import { setBranch } from "@/actions/session";
import { RoleChip } from "@/components/role-chip";
import { NETWORK_BRANCH_VALUE } from "@/lib/invoice-branch";
import type { AppRole } from "@/lib/roles";

type Branch = { id: string; name: string };

export function SessionSwitcher({
  role,
  name,
  branchId,
  branches,
  allowNetwork = false,
}: {
  role: AppRole;
  name: string;
  branchId: string | null;
  branches: Branch[];
  allowNetwork?: boolean;
}) {
  const value = branchId ?? (allowNetwork ? NETWORK_BRANCH_VALUE : "");
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1">
      <RoleChip role={role} name={name} />
      {branches.length > 1 || allowNetwork ? (
        <label className="flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">הקשר</span>
          <select
            className="h-7 max-w-[9.5rem] min-w-0 truncate rounded-full border border-border bg-card px-2 text-xs text-foreground"
            value={value}
            onChange={(event) => setBranch(event.target.value)}
          >
            {allowNetwork ? <option value={NETWORK_BRANCH_VALUE}>משרד רשת</option> : null}
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
