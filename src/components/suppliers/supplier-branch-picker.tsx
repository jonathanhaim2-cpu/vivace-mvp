"use client";

import { useState } from "react";
import { CompactField } from "@/components/ui/compact-form";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import { Input } from "@/components/ui/input";

type Branch = { id: string; name: string };

export function SupplierBranchPicker({
  branches,
  defaultSelected,
  defaultPhones,
}: {
  branches: Branch[];
  defaultSelected: string[];
  defaultPhones: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  return (
    <div className="flex w-full flex-wrap items-end gap-2">
      <CompactField
        label="זמין בסניפים"
        htmlFor="supplier-branches"
        hint="אם לא נבחר אף סניף — הספק זמין לכולם. מספר וואטסאפ לסניף דורס את המספר הכללי כששליחה לספקים דולקת."
        className="min-w-[14rem]"
      >
        <CompactMultiSelect
          id="supplier-branches"
          name="branchId"
          options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
          defaultValue={defaultSelected}
          placeholder="בחירת סניף"
          onChange={setSelected}
        />
      </CompactField>
      {selected.map((id) => {
        const branch = branches.find((item) => item.id === id);
        return (
          <CompactField key={id} label={`וואטסאפ · ${branch?.name ?? ""}`} htmlFor={`branch-wa-${id}`}>
            <Input
              id={`branch-wa-${id}`}
              name={`branchWhatsapp:${id}`}
              defaultValue={defaultPhones[id] ?? ""}
              placeholder="אופציונלי"
              className="w-40"
            />
          </CompactField>
        );
      })}
    </div>
  );
}
