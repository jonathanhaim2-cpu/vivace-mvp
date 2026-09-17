"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { buttonVariants } from "@/components/ui/button";
import { isInvoiceImage, isInvoicePdf } from "@/lib/invoice-form";
import { cn } from "@/lib/utils";

export function InvoiceDocumentPreview({
  fileUrl,
  mimeType,
  originalName,
}: {
  fileUrl: string;
  mimeType: string;
  originalName: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const image = isInvoiceImage(mimeType);
  const pdf = isInvoicePdf(mimeType, originalName);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const lightbox =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={() => setOpen(false)}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-5xl flex-col gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 text-white">
                <p id={titleId} className="truncate text-sm font-medium">
                  {originalName}
                </p>
                <button
                  type="button"
                  className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                  onClick={() => setOpen(false)}
                >
                  סגירה
                </button>
              </div>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={originalName} className="max-h-[85vh] w-full rounded-lg bg-black object-contain" />
              ) : pdf ? (
                <iframe title={originalName} src={fileUrl} className="h-[80vh] w-full rounded-lg bg-white" />
              ) : (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-white underline">
                  פתיחת הקובץ בחלון חדש
                </a>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-2">
      {image ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full overflow-hidden rounded-lg border bg-muted text-start"
          aria-label={`תצוגה מוגדלת של ${originalName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl} alt={originalName} className="h-48 w-full object-contain sm:h-56" />
        </button>
      ) : pdf ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          <iframe title="" src={`${fileUrl}#toolbar=0`} className="pointer-events-none h-48 w-full bg-white sm:h-56" tabIndex={-1} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0"
            aria-label={`פתיחת PDF ${originalName}`}
          />
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg border bg-muted text-sm">קובץ מצורף</div>
      )}
      <div className="flex flex-wrap gap-2">
        {image || pdf ? (
          <button type="button" onClick={() => setOpen(true)} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            {image ? "תצוגה מוגדלת" : "הצג PDF"}
          </button>
        ) : null}
        <a href={fileUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          פתיחה
        </a>
        <a href={fileUrl} download={originalName} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
          הורדה
        </a>
      </div>
      {lightbox}
    </div>
  );
}
