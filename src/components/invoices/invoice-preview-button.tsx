"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InvoicePreviewButton({
  fileUrl,
  originalName,
  mimeType,
}: {
  fileUrl: string;
  originalName: string;
  mimeType: string;
}) {
  const [open, setOpen] = useState(false);
  const isImage = mimeType.startsWith("image/");

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`תצוגה: ${originalName}`}
        onClick={() => setOpen(true)}
      >
        <Eye data-icon="inline-start" />
        תצוגה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="max-w-[calc(100%-2rem)] truncate">{originalName}</DialogTitle>
            <DialogDescription>תצוגה לפי דרישה — סגירה מחזירה לרשימה.</DialogDescription>
          </DialogHeader>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={originalName}
              className="mx-auto max-h-[70vh] w-full rounded-lg border bg-muted object-contain"
            />
          ) : (
            <iframe title={originalName} src={fileUrl} className="h-[70vh] w-full rounded-lg border bg-muted" />
          )}
          <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            פתיחה בחלון חדש
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
