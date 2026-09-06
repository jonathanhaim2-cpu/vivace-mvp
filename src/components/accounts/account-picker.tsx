"use client";

import { useState } from "react";
import { CHART_OF_ACCOUNTS, DEFAULT_EXPENSE_LEAF_ID, type AccountKind } from "@/lib/chart-of-accounts";
import { cn } from "@/lib/utils";

const KIND_TABS: { value: AccountKind; label: string }[] = [
  { value: "EXPENSE", label: "הוצאות" },
  { value: "INCOME", label: CHART_OF_ACCOUNTS.find((parent) => parent.kind === "INCOME")?.name ?? "הכנסות" },
];

export function AccountPicker({
  name = "accountId",
  defaultValue,
  counts,
  allowEmpty = false,
}: {
  name?: string;
  defaultValue?: string | null;
  counts?: Record<string, number>;
  allowEmpty?: boolean;
}) {
  const initial = defaultValue && CHART_OF_ACCOUNTS.some((p) => p.children.some((c) => c.id === defaultValue))
    ? defaultValue
    : allowEmpty
      ? ""
      : DEFAULT_EXPENSE_LEAF_ID;
  const initialKind =
    CHART_OF_ACCOUNTS.find((parent) => parent.children.some((child) => child.id === initial))?.kind ?? "EXPENSE";

  const [kind, setKind] = useState<AccountKind>(initialKind);
  const [selected, setSelected] = useState(initial);
  const groups = CHART_OF_ACCOUNTS.filter((parent) => parent.kind === kind);

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={selected} />
      <div className="inline-flex rounded-lg border bg-muted p-0.5">
        {KIND_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setKind(tab.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              kind === tab.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {allowEmpty ? (
        <button
          type="button"
          onClick={() => setSelected("")}
          className={cn(
            "w-full rounded-xl border px-3 py-2.5 text-start text-sm",
            selected === ""
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "bg-card hover:bg-accent/40",
          )}
        >
          בלי שיבוץ — נתח ב-AI
        </button>
      ) : null}

      <div className="space-y-5">
        {groups.map((parent) => (
          <section key={parent.id}>
            <h3 className="mb-2 font-heading text-sm font-semibold">{parent.name}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {parent.children.map((child) => {
                const active = selected === child.id;
                const count = counts?.[child.id] ?? 0;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelected(child.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-start text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "bg-card hover:bg-accent/40",
                    )}
                  >
                    <span className="block leading-snug">{child.name}</span>
                    {count > 0 ? (
                      <span className="mt-1 block text-[11px] text-muted-foreground">{count} מסמכים</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
