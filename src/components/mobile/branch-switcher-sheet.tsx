"use client";

import { setBranch } from "@/actions/session";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NETWORK_BRANCH_VALUE } from "@/lib/invoice-branch";
import { cn } from "@/lib/utils";

type Branch = { id: string; name: string };

export function BranchSwitcherSheet({
  open,
  onOpenChange,
  branches,
  branchId,
  allowNetwork,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  branchId: string | null;
  allowNetwork: boolean;
}) {
  const current = branchId ?? (allowNetwork ? NETWORK_BRANCH_VALUE : "");

  function choose(value: string) {
    onOpenChange(false);
    void setBranch(value);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[70vh] gap-3 rounded-t-3xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <SheetTitle className="text-base">מעבר סניף</SheetTitle>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {allowNetwork ? (
            <button
              type="button"
              onClick={() => choose(NETWORK_BRANCH_VALUE)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-start text-sm font-medium",
                current === NETWORK_BRANCH_VALUE ? "border-primary bg-primary/10 text-primary" : "bg-card",
              )}
            >
              משרד רשת
            </button>
          ) : null}
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => choose(branch.id)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-start text-sm font-medium",
                current === branch.id ? "border-primary bg-primary/10 text-primary" : "bg-card",
              )}
            >
              {branch.name}
            </button>
          ))}
          {branches.length === 0 && !allowNetwork ? (
            <p className="text-sm text-muted-foreground">אין סניפים לבחירה.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
