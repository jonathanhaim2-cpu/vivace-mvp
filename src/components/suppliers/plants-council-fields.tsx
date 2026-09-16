"use client";

import { useState } from "react";
import { CompactField, NativeSelect } from "@/components/ui/compact-form";
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
    <div className="flex flex-wrap items-end gap-2">
      <CompactField label={PLANTS_COUNCIL.nameHe} htmlFor="plants-relevant">
        <NativeSelect
          id="plants-relevant"
          name="plantsCouncilRelevant"
          value={on ? "true" : "false"}
          onChange={(event) => setOn(event.target.value === "true")}
        >
          <option value="false">לא רלוונטי</option>
          <option value="true">רלוונטי</option>
        </NativeSelect>
      </CompactField>
      {on ? (
        <>
          <CompactField label="קישור מחירון" htmlFor="plantsCouncilUrl" grow>
            <Input
              id="plantsCouncilUrl"
              name="plantsCouncilUrl"
              defaultValue={url ?? ""}
              placeholder={PLANTS_COUNCIL.defaultUrl}
            />
          </CompactField>
          <CompactField label="% מתחת למחירון" htmlFor="plantsCouncilDiscountPct">
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
          </CompactField>
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
    <CompactField label={PLANTS_COUNCIL.nameHe} htmlFor="plantsCouncilRelevant">
      <NativeSelect
        id="plantsCouncilRelevant"
        name="plantsCouncilRelevant"
        defaultValue={productRelevant === false ? "false" : "inherit"}
      >
        <option value="inherit">ירושה מהספק</option>
        <option value="false">לא רלוונטי למוצר זה</option>
      </NativeSelect>
    </CompactField>
  );
}
