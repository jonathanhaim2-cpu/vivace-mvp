"use client";

import { useState } from "react";
import { updateAnnualPurchaseTarget } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIls } from "@/lib/format";

export function AnnualTargetCell({ supplierId, value }: { supplierId: string; value: number | null }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button type="button" className="text-sm underline-offset-2 hover:underline" onClick={() => setEditing(true)}>
        {value == null ? "הגדרת יעד" : formatIls(value)}
      </button>
    );
  }
  return (
    <form action={updateAnnualPurchaseTarget.bind(null, supplierId)} className="flex items-center gap-1">
      <Input
        name="annualPurchaseTargetIls"
        type="number"
        min={0}
        step="1"
        defaultValue={value ?? ""}
        className="h-8 w-28"
        autoFocus
        aria-label="יעד רכש שנתי"
      />
      <Button type="submit" size="sm">
        שמירה
      </Button>
    </form>
  );
}
