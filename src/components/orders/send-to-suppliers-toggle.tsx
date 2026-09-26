"use client";

import { useOptimistic, useTransition } from "react";
import { setSendToSuppliers } from "@/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function RoiTestModeBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn("text-[11px]", className)}>
      מצב בדיקה — נשלח לרועי
    </Badge>
  );
}

export function SendToSuppliersToggle({
  enabled,
  compact = false,
  label = "שליחה לספקים",
  bare = false,
}: {
  enabled: boolean;
  compact?: boolean;
  label?: string;
  bare?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useOptimistic(enabled);

  function toggle(next: boolean) {
    startTransition(async () => {
      setOn(next);
      await setSendToSuppliers(next);
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        bare ? "w-full" : "rounded-full border border-border bg-card px-2.5 py-1",
        !bare && (compact ? "max-w-full" : "w-full sm:w-auto"),
      )}
    >
      <Switch
        checked={on}
        disabled={pending}
        size={compact ? "sm" : "default"}
        aria-label={label}
        onCheckedChange={toggle}
      />
      <div className={cn("min-w-0", compact ? "hidden sm:block" : "block")}>
        <p className="text-xs font-medium leading-tight">{label}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {on ? "וואטסאפ למספר האמיתי של הספק" : "מצב בדיקה — נשלח לרועי"}
        </p>
      </div>
      {!on ? <RoiTestModeBadge className={compact ? "hidden md:inline-flex" : undefined} /> : null}
    </div>
  );
}
