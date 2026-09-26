"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function assignFile(input: HTMLInputElement | null, file: File | null) {
  if (!input) return;
  if (!file) {
    input.value = "";
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

export function InvoiceCaptureField({
  required = true,
  pending = false,
  onFile,
  compact = false,
  idPrefix = "",
}: {
  required?: boolean;
  pending?: boolean;
  onFile?: (file: File | null) => void;
  compact?: boolean;
  idPrefix?: string;
}) {
  const cameraId = idPrefix ? `${idPrefix}-photo-camera` : "photo-camera";
  const photoId = idPrefix ? `${idPrefix}-photo` : "photo";
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!required) {
      photoRef.current?.setCustomValidity("");
      return;
    }
    photoRef.current?.setCustomValidity(fileName ? "" : "חובה לצלם או לבחור קובץ");
  }, [fileName, required]);

  function applyFile(file: File | null, target?: HTMLInputElement | null) {
    if (target && target !== photoRef.current) {
      assignFile(photoRef.current, file);
    }
    setFileName(file?.name ?? null);
    onFile?.(file);
  }

  const controls = (
    <div className={cn("flex flex-wrap items-end gap-2", compact ? "" : "sm:items-center")}>
      <input
        ref={cameraRef}
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          applyFile(event.target.files?.[0] ?? null, event.target);
          event.target.value = "";
        }}
      />
      <Button type="button" size="sm" className="mb-0.5" onClick={() => cameraRef.current?.click()}>
        <Camera data-icon="inline-start" />
        צלם חשבונית
      </Button>
      <div className="min-w-[12rem] flex-1">
        <label htmlFor={photoId} className="mb-1 block text-[11px] font-medium text-muted-foreground">
          בחר מהגלריה
        </label>
        <Input
          ref={photoRef}
          id={photoId}
          name="photo"
          type="file"
          accept="image/*,application/pdf"
          required={required}
          onChange={(event) => applyFile(event.target.files?.[0] ?? null, event.currentTarget)}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {controls}
        <p className="text-[11px] text-muted-foreground">
          {pending ? "סורק את המסמך..." : "צלם במצלמה או בחר מהגלריה / קבצים."}
        </p>
      </div>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor="photo">צילום חשבונית / תעודת משלוח</FieldLabel>
      {controls}
      <FieldDescription>
        {pending
          ? "סורק את המסמך וממלא כמויות..."
          : "שתי אפשרויות — העובד בוחר: «צלם חשבונית» פותח מצלמה בטלפון, והעלאת הקובץ נשארת לבחירה מהגלריה או מתיקייה. במחשב ממשיכים עם בחירת קובץ. חובה לצרף צילום."}
      </FieldDescription>
    </Field>
  );
}
