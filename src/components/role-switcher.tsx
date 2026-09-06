"use client";

import { setBranch, setRole } from "@/actions/session";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/constants";

type Branch = { id: string; name: string };

export function RoleSwitcher({
  role,
  branchId,
  branches,
}: {
  role: Role;
  branchId: string | null;
  branches: Branch[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={role === "branch" ? "default" : "ghost"}
          className={role === "branch" ? "" : "text-sidebar-foreground hover:bg-sidebar-accent"}
          onClick={() => setRole("branch", branchId ?? undefined)}
        >
          סניף
        </Button>
        <Button
          type="button"
          size="sm"
          variant={role === "network" ? "default" : "ghost"}
          className={role === "network" ? "" : "text-sidebar-foreground hover:bg-sidebar-accent"}
          onClick={() => setRole("network", branchId ?? undefined)}
        >
          רשת
        </Button>
      </div>
      {branches.length > 0 ? (
        <label className="flex items-center gap-1.5 text-xs text-sidebar-foreground/80">
          <span className="hidden sm:inline">סניף פעיל</span>
          <select
            className="h-7 rounded-md border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground"
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
      ) : null}
    </div>
  );
}
