"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PLANTS_COUNCIL } from "@/lib/plants-council";

export function PlantsCouncilSupplierFields({
  relevant = false,
  url,
  discountPct,
}: {
  relevant?: boolean;
  url?: string | null;
  discountPct?: number | null;
}) {
  const [on, setOn] = useState(relevant);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="hidden" name="plantsCouncilRelevant" value="false" />
        <input
          type="checkbox"
          name="plantsCouncilRelevant"
          value="true"
          checked={on}
          onChange={(event) => setOn(event.target.checked)}
        />
        רלוונטי ל{PLANTS_COUNCIL.nameHe} (ברירת מחדל: לא)
      </label>
      {on ? (
        <>
          <Field>
            <FieldLabel htmlFor="plantsCouncilUrl">קישור מחירון {PLANTS_COUNCIL.nameHe}</FieldLabel>
            <Input
              id="plantsCouncilUrl"
              name="plantsCouncilUrl"
              defaultValue={url ?? ""}
              placeholder={PLANTS_COUNCIL.defaultUrl}
            />
            <FieldDescription>{PLANTS_COUNCIL.noteHe}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="plantsCouncilDiscountPct">% מתחת למחירון המועצה</FieldLabel>
            <Input
              id="plantsCouncilDiscountPct"
              name="plantsCouncilDiscountPct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={discountPct ?? ""}
              placeholder="10"
            />
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name="plantsCouncilUrl" value={url ?? ""} />
          <input type="hidden" name="plantsCouncilDiscountPct" value={discountPct ?? ""} />
        </>
      )}
    </div>
  );
}

export function PlantsCouncilProductField({
  supplierRelevant,
  productRelevant,
}: {
  supplierRelevant: boolean;
  productRelevant: boolean | null | undefined;
}) {
  if (!supplierRelevant) {
    return <input type="hidden" name="plantsCouncilRelevant" value="inherit" />;
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="hidden" name="plantsCouncilRelevant" value="false" />
      <input
        type="checkbox"
        name="plantsCouncilRelevant"
        value="true"
        defaultChecked={productRelevant !== false}
      />
      רלוונטי ל{PLANTS_COUNCIL.nameHe} (ירושה מהספק; אפשר לכבות למוצר זה)
    </label>
  );
}
