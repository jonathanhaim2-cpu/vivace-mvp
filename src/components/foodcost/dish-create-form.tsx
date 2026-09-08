"use client";

import { useState } from "react";
import { createDish } from "@/actions/dishes";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function DishCreateForm() {
  const [kind, setKind] = useState("DISH");

  return (
    <form action={createDish} className="grid max-w-xl gap-4">
      <Field>
        <FieldLabel htmlFor="name">שם</FieldLabel>
        <Input id="name" name="name" required placeholder="פיצה מרגריטה" />
      </Field>
      <Field>
        <FieldLabel htmlFor="kind">סוג</FieldLabel>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="DISH">מנה למכירה</option>
          <option value="INTERMEDIATE">מנת ביניים / עיבוד</option>
        </select>
      </Field>
      {kind === "INTERMEDIATE" ? (
        <p className="text-sm text-muted-foreground">למנת ביניים אין מחיר מכירה — רק עלות רכיבים.</p>
      ) : (
        <Field>
          <FieldLabel htmlFor="sellPrice">מחיר מכירה (₪, אופציונלי)</FieldLabel>
          <Input id="sellPrice" name="sellPrice" type="number" min={0} step="0.01" />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="notes">הערות</FieldLabel>
        <Textarea id="notes" name="notes" />
      </Field>
      <Button type="submit">יצירה והוספת רכיבים</Button>
    </form>
  );
}
