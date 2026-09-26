import { INVOICE_LIST_STATUS_META, type InvoiceListStatus } from "@/lib/invoice-list-status";
import { cn } from "@/lib/utils";

const TONE = {
  green: "bg-brand-green/15 text-brand-green",
  amber: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
  red: "bg-destructive/10 text-destructive",
} as const;

export function InvoiceStatusPill({ status }: { status: InvoiceListStatus }) {
  const meta = INVOICE_LIST_STATUS_META[status];
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap", TONE[meta.tone])}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

export function AiConfidenceTag({
  confidence,
  status,
}: {
  confidence: number | null;
  status: string | null;
}) {
  if (confidence == null && status !== "CONFIRMED" && status !== "SUGGESTED" && status !== "MANUAL") return null;
  const percent = confidence != null ? `${Math.round(confidence * 100)}%` : null;
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
      AI{percent ? ` · ${percent}` : ""}
    </span>
  );
}
