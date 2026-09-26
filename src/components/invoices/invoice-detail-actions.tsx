"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, X } from "lucide-react";
import { saveInvoiceClassification, updateInvoiceCategory } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { DiscardInvoiceButton } from "@/components/invoices/discard-invoice-button";
import { DocumentTypeSelect } from "@/components/invoices/document-type-control";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NETWORK_BRANCH_VALUE } from "@/lib/invoice-branch";

export function InvoiceDetailMenu({
  photoId,
  accountId,
  canDelete,
}: {
  photoId: string;
  accountId: string | null;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="פעולות נוספות"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {menuOpen ? (
        <div className="absolute end-0 z-20 mt-1 w-40 rounded-2xl border bg-popover p-1 shadow-lg">
          {canDelete ? (
            <DiscardInvoiceButton photoId={photoId} accountId={accountId} className="w-full justify-start" />
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">אי אפשר למחוק מסמך ששולם או נשלח להנה״ח.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function InvoiceEditSheet({
  photoId,
  accountId,
  branchId,
  documentType,
  periodMonth,
  classified,
  invoiceDate,
  supplierName,
  amountIls,
  note,
  vatIncluded,
  branches,
}: {
  photoId: string;
  accountId: string | null;
  branchId: string | null;
  documentType: string;
  periodMonth: string;
  classified: boolean;
  invoiceDate: string;
  supplierName: string;
  amountIls: string;
  note: string;
  vatIncluded: boolean;
  branches: BranchOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const action = classified
    ? updateInvoiceCategory.bind(null, photoId)
    : saveInvoiceClassification.bind(null, photoId);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold"
      >
        <Pencil className="size-4" />
        עריכה (סיווג, סניף, סוג מסמך)
      </button>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[88vh] gap-3 overflow-y-auto rounded-t-3xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <SheetClose className="flex size-9 items-center justify-center rounded-full" aria-label="סגירה">
              <X className="size-5" />
            </SheetClose>
            <SheetTitle className="text-lg font-bold">עריכה</SheetTitle>
          </div>
          <form action={action} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">קטגוריה</span>
              <GroupedAccountSelect defaultValue={accountId} required allowEmpty={false} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">סניף</span>
              <BranchSelect
                branches={branches}
                defaultValue={branchId ?? NETWORK_BRANCH_VALUE}
                required
                allowEmpty={false}
                allowNetwork
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">סוג מסמך</span>
              <DocumentTypeSelect defaultValue={documentType} />
            </label>
            <input type="hidden" name="periodMonth" value={periodMonth} />
            {classified ? null : (
              <>
                <input type="hidden" name="invoiceDate" value={invoiceDate} />
                <input type="hidden" name="supplierName" value={supplierName} />
                <input type="hidden" name="amountIls" value={amountIls} />
                <input type="hidden" name="note" value={note} />
                <input type="hidden" name="vatIncluded" value={vatIncluded ? "incl" : "ex"} />
              </>
            )}
            <Button type="submit" className="h-11 w-full rounded-2xl">
              שמירה
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
