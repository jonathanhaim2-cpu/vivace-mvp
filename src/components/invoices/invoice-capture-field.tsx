"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
}: {
  required?: boolean;
  pending?: boolean;
  onFile?: (file: File | null) => void;
  compact?: boolean;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!required) {
      photoRef.current?.setCustomValidity("");
      return;
    }
    photoRef.current?.setCustomValidity(fileName ? "" : "חובה לצלם או לבחור קובץ");
  }, [fileName, required]);

  function applyFile(file: File | null) {
    assignFile(photoRef.current, file);
    setFileName(file?.name ?? null);
    onFile?.(file);
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={photoRef}
        id="photo"
        name="photo"
        type="file"
        accept="image/*,application/pdf"
        required={required}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
      />
      <Button type="button" size="sm" onClick={() => cameraRef.current?.click()}>
        <Camera data-icon="inline-start" />
        צלם חשבונית
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => galleryRef.current?.click()}>
        <Images data-icon="inline-start" />
        בחר מהגלריה
      </Button>
      <p className={cn("text-xs", fileName ? "text-foreground" : "text-muted-foreground")}>
        {fileName ?? (required ? "חובה לצלם או לבחור קובץ" : "אופציונלי")}
      </p>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {controls}
        {pending ? <p className="text-xs text-primary">סורק את המסמך...</p> : null}
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
          : "בטלפון «צלם חשבונית» פותח מצלמה ישירות. במחשב אפשר לבחור קובץ. חובה לשמור את הקובץ."}
      </FieldDescription>
    </Field>
  );
}
