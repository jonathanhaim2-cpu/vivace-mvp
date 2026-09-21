import { NativeSelect } from "@/components/ui/compact-form";
import {
  PHOTO_DOCUMENT_TYPES,
  parsePhotoDocumentType,
  photoDocumentTypeLabel,
} from "@/lib/constants";
import { INVOICE_DOCUMENT_TYPE_FILTERS } from "@/lib/invoice-filters";
import { cn } from "@/lib/utils";

const selectClassName = "h-8 w-full min-w-[10rem] rounded-lg border border-input bg-background px-2.5 text-sm";

export function DocumentTypeSelect({
  id,
  name = "documentType",
  defaultValue,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <NativeSelect id={id} name={name} defaultValue={parsePhotoDocumentType(defaultValue)} className={className}>
      {PHOTO_DOCUMENT_TYPES.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function DocumentTypeFilterSelect({
  id = "filter-documentType",
  name = "documentType",
  defaultValue,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? "all"} className={cn(selectClassName, className)}>
      {INVOICE_DOCUMENT_TYPE_FILTERS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function DocumentTypeBadge({ value }: { value: string | null | undefined }) {
  const type = parsePhotoDocumentType(value);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
        type === "INVOICE" && "bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100",
        type === "CREDIT_NOTE" && "bg-rose-100 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100",
        type === "RECEIPT" && "bg-violet-100 text-violet-950 dark:bg-violet-950/60 dark:text-violet-100",
        type === "DELIVERY_NOTE" && "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100",
        type === "STATEMENT" && "bg-slate-200 text-slate-950 dark:bg-slate-800 dark:text-slate-100",
        type === "UNKNOWN" && "bg-muted text-muted-foreground",
      )}
    >
      {photoDocumentTypeLabel(type)}
    </span>
  );
}
