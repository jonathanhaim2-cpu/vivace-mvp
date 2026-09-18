"use client";

import { useState } from "react";
import { CompactField, NativeSelect } from "@/components/ui/compact-form";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHODS, PRICE_LIST_KIND } from "@/lib/constants";

type Branch = { id: string; name: string };
type LinkDefaults = {
  whatsappPhone?: string | null;
  taxId?: string | null;
  driverName?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  deliveryDays?: string | null;
  orderDays?: string | null;
  orderCutoffTime?: string | null;
  catalogKind?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentChargeDay?: number | null;
};

export function SupplierBranchPicker({
  branches,
  defaultSelected,
  defaultPhones,
  defaultLinks = {},
}: {
  branches: Branch[];
  defaultSelected: string[];
  defaultPhones: Record<string, string>;
  defaultLinks?: Record<string, LinkDefaults>;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  return (
    <div className="space-y-3">
      <CompactField
        label="סניפים"
        htmlFor="supplier-branches"
        hint="חובה לבחור סניף. בית שמש וקריית יערים נשמרים בנפרד — מפיץ, ח.פ. ומחירון לפי סניף."
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
        const link = defaultLinks[id] ?? {};
        return (
          <div key={id} className="rounded-lg border bg-muted/20 p-2.5">
            <p className="mb-2 text-xs font-medium">{branch?.name ?? id} · מפיץ</p>
            <div className="flex flex-wrap gap-2">
              <CompactField label="וואטסאפ" htmlFor={`branch-wa-${id}`}>
                <Input
                  id={`branch-wa-${id}`}
                  name={`branchWhatsapp:${id}`}
                  defaultValue={defaultPhones[id] ?? link.whatsappPhone ?? ""}
                  placeholder="אופציונלי"
                  className="w-36"
                />
              </CompactField>
              <CompactField label="ח.פ." htmlFor={`branch-tax-${id}`}>
                <Input
                  id={`branch-tax-${id}`}
                  name={`branchTaxId:${id}`}
                  defaultValue={link.taxId ?? ""}
                  className="w-32"
                />
              </CompactField>
              <CompactField label="מפיץ" htmlFor={`branch-drv-${id}`}>
                <Input
                  id={`branch-drv-${id}`}
                  name={`branchDriver:${id}`}
                  defaultValue={link.driverName ?? ""}
                  className="w-32"
                />
              </CompactField>
              <CompactField label="סוכן" htmlFor={`branch-ag-${id}`}>
                <Input
                  id={`branch-ag-${id}`}
                  name={`branchAgent:${id}`}
                  defaultValue={link.agentName ?? ""}
                  className="w-32"
                />
              </CompactField>
              <CompactField label="טל׳ סוכן" htmlFor={`branch-agp-${id}`}>
                <Input
                  id={`branch-agp-${id}`}
                  name={`branchAgentPhone:${id}`}
                  defaultValue={link.agentPhone ?? ""}
                  className="w-32"
                />
              </CompactField>
              <CompactField label="סגירת הזמנה" htmlFor={`branch-cut-${id}`}>
                <Input
                  id={`branch-cut-${id}`}
                  name={`branchCutoff:${id}`}
                  type="time"
                  dir="ltr"
                  defaultValue={link.orderCutoffTime ?? ""}
                  className="w-32"
                />
              </CompactField>
              <CompactField label="מחירון" htmlFor={`branch-cat-${id}`}>
                <NativeSelect
                  id={`branch-cat-${id}`}
                  name={`branchCatalog:${id}`}
                  defaultValue={link.catalogKind ?? PRICE_LIST_KIND.FRANCHISEE}
                  className="w-36"
                >
                  <option value={PRICE_LIST_KIND.FRANCHISEE}>זכיין</option>
                  <option value={PRICE_LIST_KIND.NETWORK}>רשת</option>
                </NativeSelect>
              </CompactField>
              <CompactField label="אמצעי תשלום" htmlFor={`branch-pay-${id}`}>
                <NativeSelect
                  id={`branch-pay-${id}`}
                  name={`branchPay:${id}`}
                  defaultValue={link.paymentMethod ?? ""}
                  className="w-36"
                >
                  <option value="">כמו הספק</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </NativeSelect>
              </CompactField>
              <CompactField label="יום חיוב" htmlFor={`branch-chg-${id}`}>
                <Input
                  id={`branch-chg-${id}`}
                  name={`branchChargeDay:${id}`}
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={link.paymentChargeDay ?? ""}
                  className="w-24"
                />
              </CompactField>
            </div>
          </div>
        );
      })}
    </div>
  );
}
