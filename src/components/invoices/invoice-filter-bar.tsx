"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { INVOICE_STATUS_FILTERS, type InvoiceListFilters } from "@/lib/invoice-filters";
import { monthLabel } from "@/lib/months";
import { cn } from "@/lib/utils";

const selectClassName = "h-8 w-full min-w-[9rem] rounded-lg border border-input bg-background px-2.5 text-sm";

export function InvoiceFilterBar({
  filters,
  months,
  suppliers,
  branches,
}: {
  filters: InvoiceListFilters;
  months: string[];
  suppliers: string[];
  branches: BranchOption[];
}) {
  function submitOnSelect(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && target.type === "date")
    ) {
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <form method="get" action="/invoices" onChange={submitOnSelect} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">חודש</span>
        <select id="filter-month" name="month" defaultValue={filters.month} className={selectClassName}>
          <option value="all">כל החודשים</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">מתאריך</span>
        <Input id="filter-from" name="from" type="date" defaultValue={filters.from} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">עד תאריך</span>
        <Input id="filter-to" name="to" type="date" defaultValue={filters.to} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">קטגוריה / עלות</span>
        <GroupedAccountSelect
          id="filter-category"
          name="category"
          defaultValue={filters.category}
          required={false}
          allowEmpty
          emptyLabel="כל הקטגוריות"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">סטטוס</span>
        <select id="filter-status" name="status" defaultValue={filters.status} className={selectClassName}>
          {INVOICE_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {suppliers.length > 0 ? (
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">ספק</span>
          <select id="filter-supplier" name="supplier" defaultValue={filters.supplier} className={selectClassName}>
            <option value="">כל הספקים</option>
            {suppliers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {branches.length > 0 ? (
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">סניף</span>
          <BranchSelect
            id="filter-branch"
            name="branch"
            branches={branches}
            defaultValue={filters.branch}
            allowEmpty
            emptyLabel="כל הסניפים"
          />
        </label>
      ) : null}
      <label className={cn("text-sm", suppliers.length > 0 ? "md:col-span-2" : "")}>
        <span className="mb-1 block text-muted-foreground">חיפוש</span>
        <Input id="filter-q" name="q" defaultValue={filters.q} placeholder="שם קובץ או סכום" autoComplete="off" />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <Button type="submit" size="sm">
          סינון
        </Button>
        <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          איפוס לחודש הנוכחי
        </Link>
      </div>
    </form>
  );
}
