"use client";

import type { ReactNode } from "react";
import { Upload, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function InvoiceUploadSheet({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="העלאה וניתוח"
        className="flex size-10 items-center justify-center rounded-full border border-border bg-card"
      >
        <Upload className="size-4" />
      </SheetTrigger>
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
          <SheetTitle className="text-lg font-bold">העלאה + ניתוח</SheetTitle>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
