"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { DocumentTypeFilterSelect } from "@/components/invoices/document-type-control";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { INVOICE_STATUS_FILTERS, type InvoiceListFilters } from "@/lib/invoice-filters";
import { cn } from "@/lib/utils";

export function InvoiceFilterSheet({
  filters,
  suppliers,
  branches,
  resultCount,
  activeCount,
}: {
  filters: InvoiceListFilters;
  suppliers: string[];
  branches: BranchOption[];
  resultCount: number;
  activeCount: number;
}) {
  const [status, setStatus] = useState(filters.status);

  return (
    <Sheet>
      <SheetTrigger
        className="relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium"
        aria-label="סינון"
      >
        <SlidersHorizontal className="size-4" />
        סינון
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[88vh] gap-4 overflow-y-auto rounded-t-3xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between gap-2">
          <SheetTitle className="text-lg font-bold">סינון חשבוניות</SheetTitle>
          <SheetClose className="flex size-9 items-center justify-center rounded-full bg-muted" aria-label="סגירה">
            <X className="size-5" />
          </SheetClose>
        </div>
        <form method="get" action="/invoices" className="space-y-4">
          <input type="hidden" name="month" value={filters.month} />
          {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
          <fieldset>
            <legend className="mb-2 text-sm text-muted-foreground">סטטוס</legend>
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUS_FILTERS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm",
                    status === option.value ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card",
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={status === option.value}
                    onChange={() => setStatus(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {suppliers.length > 0 ? (
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">ספק</span>
              <select name="supplier" defaultValue={filters.supplier} className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm">
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
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">סניף</span>
              <BranchSelect
                name="branch"
                branches={branches}
                defaultValue={filters.branch}
                allowEmpty
                allowNetwork
                emptyLabel="כל הסניפים"
                networkLabel="רשת"
                className="h-10 rounded-xl"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">קטגוריה</span>
            <GroupedAccountSelect name="category" defaultValue={filters.category} required={false} allowEmpty emptyLabel="כל הקטגוריות" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">סוג מסמך</span>
            <DocumentTypeFilterSelect
              id="mobile-filter-documentType"
              name="documentType"
              defaultValue={filters.documentType}
              className="h-10 rounded-xl"
            />
          </label>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">טווח תאריכים</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">מתאריך</span>
                <Input name="from" type="date" defaultValue={filters.from} />
              </label>
              <span className="pb-2 text-muted-foreground">–</span>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">עד תאריך</span>
                <Input name="to" type="date" defaultValue={filters.to} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl px-4")}>
              נקה הכול
            </Link>
            <Button type="submit" className="h-12 rounded-2xl">
              הצג {resultCount} תוצאות
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
