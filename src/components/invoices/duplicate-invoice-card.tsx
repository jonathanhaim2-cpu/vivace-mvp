import { confirmInvoiceUnique } from "@/actions/invoices";
import { AuditInfoButton } from "@/components/audit-info-button";
import { DiscardInvoiceButton } from "@/components/invoices/discard-invoice-button";
import { Button } from "@/components/ui/button";
import { INVOICE_SOURCE, invoiceSourceLabel } from "@/lib/constants";
import { DocumentTypeBadge } from "@/components/invoices/document-type-control";
import { formatDateTime, formatIls } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import { publicFileUrl } from "@/lib/uploads";

type DuplicateOriginal = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  aiSupplierName: string | null;
  aiInvoiceDate: string | null;
  aiTotalIls: number | null;
  amountIls: number | null;
} | null;

type Props = {
  photo: {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    createdAt: Date;
    periodMonth: string | null;
    source: string;
    amountIls: number | null;
    documentType?: string | null;
    duplicateOf: DuplicateOriginal;
  };
  auditStamp: string;
};

export function DuplicateInvoiceCard({ photo, auditStamp }: Props) {
  const fileUrl = publicFileUrl(photo.fileName);
  const original = photo.duplicateOf;
  const originalUrl = original ? publicFileUrl(original.fileName) : null;
  const originalAmount = original?.amountIls ?? original?.aiTotalIls ?? null;

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-0.5">
          <div className="min-w-0">
            <p className="font-medium">
              {original ? `חשוד ככפיל של ${original.originalName}` : "חשוד ככפיל"}
            </p>
            <p className="text-xs text-amber-900">כפילות — לא יובא שוב</p>
            <p className="text-xs text-muted-foreground">
              {photo.originalName} · {formatDateTime(photo.createdAt)}
              {photo.periodMonth ? ` · ${monthLabel(photo.periodMonth)}` : ""}
              {photo.source && photo.source !== INVOICE_SOURCE.MANUAL ? ` · ${invoiceSourceLabel(photo.source)}` : ""}
              {photo.amountIls != null ? ` · ${formatIls(photo.amountIls)}` : ""}
            </p>
            <div className="mt-1">
              <DocumentTypeBadge value={photo.documentType} />
            </div>
          </div>
          <AuditInfoButton stamp={auditStamp} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={fileUrl} target="_blank" rel="noreferrer" className="block">
          {photo.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={photo.originalName}
              className="h-36 w-full rounded-lg border object-cover"
            />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border bg-muted text-sm">
              קובץ מצורף
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">העותק שהועלה</p>
        </a>
        {original && originalUrl ? (
          <a href={originalUrl} target="_blank" rel="noreferrer" className="block">
            {original.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={originalUrl}
                alt={original.originalName}
                className="h-36 w-full rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border bg-muted text-sm">
                המסמך המקורי
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              המקור{originalAmount != null ? ` · ${formatIls(originalAmount)}` : ""}
              {original.aiSupplierName ? ` · ${original.aiSupplierName}` : ""}
              {original.aiInvoiceDate ? ` · ${original.aiInvoiceDate}` : ""}
            </p>
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <form action={confirmInvoiceUnique.bind(null, photo.id)}>
          <Button type="submit" size="sm">
            זה לא כפיל — כלול
          </Button>
        </form>
        <DiscardInvoiceButton photoId={photo.id} isDuplicate label="מחק כפיל" />
      </div>
    </div>
  );
}
