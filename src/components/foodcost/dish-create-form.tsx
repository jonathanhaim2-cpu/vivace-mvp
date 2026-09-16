"use client";

import { useState } from "react";
import { createDish } from "@/actions/dishes";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";

export function DishCreateForm() {
  const [kind, setKind] = useState("DISH");

  return (
    <CompactForm action={createDish}>
      <CompactField label="שם" htmlFor="name" grow>
        <Input id="name" name="name" required placeholder="פיצה מרגריטה" />
      </CompactField>
      <CompactField label="סוג" htmlFor="kind">
        <NativeSelect
          id="kind"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="DISH">מנה למכירה</option>
          <option value="INTERMEDIATE">מנת ביניים / עיבוד</option>
        </NativeSelect>
      </CompactField>
      {kind === "INTERMEDIATE" ? (
        <p className="flex h-8 items-center text-xs text-muted-foreground">למנת ביניים אין מחיר מכירה.</p>
      ) : (
        <CompactField label="מחיר מכירה (₪)" htmlFor="sellPrice">
          <Input id="sellPrice" name="sellPrice" type="number" min={0} step="0.01" />
        </CompactField>
      )}
      <CompactField label="הערות" htmlFor="notes" grow>
        <Input id="notes" name="notes" />
      </CompactField>
      <Button type="submit">יצירה והוספת רכיבים</Button>
    </CompactForm>
  );
}
