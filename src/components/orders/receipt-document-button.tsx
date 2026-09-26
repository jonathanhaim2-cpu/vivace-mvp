"use client";

import { useState } from "react";
import { Download, Eye, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ReceiptDocumentButton({
  supplierName,
  orderLabel,
  fileUrl,
  originalName,
  mimeType,
  supplierEmail,
}: {
  supplierName: string;
  orderLabel: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  supplierEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isImage = mimeType.startsWith("image/");
  const mailto = `mailto:${supplierEmail ?? ""}?subject=${encodeURIComponent(`מסמך קליטה · ${supplierName} · ${orderLabel}`)}&body=${encodeURIComponent(`מסמך הקליטה עבור ${supplierName}.\n${fileUrl}`)}`;

  return (
    <>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
        aria-label={`צפייה במסמך הקליטה של ${supplierName}`}
        onClick={() => setOpen(true)}
      >
        <Eye className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>מסמך קליטה · {supplierName}</DialogTitle>
            <DialogDescription>{originalName}</DialogDescription>
          </DialogHeader>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={originalName} className="mx-auto max-h-[60vh] w-full rounded-lg border bg-muted object-contain" />
          ) : (
            <iframe title={originalName} src={fileUrl} className="h-[60vh] w-full rounded-lg border bg-muted" />
          )}
          <div className="flex flex-wrap gap-2">
            <a href={mailto} className="inline-flex">
              <Button type="button" variant="outline" size="sm">
                <Mail data-icon="inline-start" />
                שליחה
              </Button>
            </a>
            <a href={fileUrl} download={originalName}>
              <Button type="button" variant="outline" size="sm">
                <Download data-icon="inline-start" />
                הורדה
              </Button>
            </a>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <Button type="button" size="sm">
                <Share2 data-icon="inline-start" />
                ייצוא
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
