"use client";

import { useState } from "react";
import { Download, Eye, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { isInvoiceImage, isInvoicePdf } from "@/lib/invoice-form";
import { cn } from "@/lib/utils";

export function InvoiceDetailDocument({
  fileUrl,
  mimeType,
  originalName,
}: {
  fileUrl: string;
  mimeType: string;
  originalName: string;
}) {
  const [open, setOpen] = useState(false);
  const image = isInvoiceImage(mimeType);
  const pdf = isInvoicePdf(mimeType, originalName);
  const kind = pdf ? "PDF" : image ? "תמונה" : "קובץ";

  async function share() {
    const absolute = new URL(fileUrl, window.location.origin).href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: originalName, url: absolute });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(absolute, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{originalName}</p>
          <p className="text-xs text-muted-foreground">{kind}</p>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">{kind}</span>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setOpen(true)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-xl")}>
          <Eye data-icon="inline-start" />
          צפייה
        </button>
        <a href={fileUrl} download={originalName} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-xl")}>
          <Download data-icon="inline-start" />
          הורדה
        </a>
        <button type="button" onClick={() => void share()} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-xl")}>
          <Send data-icon="inline-start" />
          שליחה
        </button>
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
          role="dialog"
          aria-modal="true"
          aria-label={originalName}
          onClick={() => setOpen(false)}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-2" onClick={(event) => event.stopPropagation()}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={originalName} className="max-h-[80vh] w-full rounded-lg object-contain" />
            ) : (
              <iframe title={originalName} src={fileUrl} className="h-[75vh] w-full rounded-lg bg-white" />
            )}
            <button type="button" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "self-center")}>
              סגירה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
