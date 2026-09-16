import { saveInvoiceClassification } from "@/actions/invoices";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { AiSuggestionCard } from "@/components/ai-suggestion-card";
import { AnalyzeInvoiceButton } from "@/components/analyze-invoice-button";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { chartLeafMeta } from "@/lib/chart-of-accounts";
import { formatDateTime } from "@/lib/format";
import { toDateInputValue } from "@/lib/invoice-form";
import { monthKeyFromDate, monthLabel, resolvedPeriodMonth } from "@/lib/months";
import { publicFileUrl } from "@/lib/uploads";

export type PendingInvoicePhoto = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  createdAt: Date;
  source: string;
  periodMonth: string | null;
  amountIls: number | null;
  voiceNoteText: string | null;
  aiSupplierName: string | null;
  aiInvoiceDate: string | null;
  aiTotalIls: number | null;
  aiAccountId: string | null;
  aiConfidence: number | null;
  aiReason: string | null;
  aiStatus: string | null;
};

export function PendingInvoiceCard({ photo, months }: { photo: PendingInvoicePhoto; months: string[] }) {
  const fileUrl = publicFileUrl(photo.fileName);
  const reportMonth = resolvedPeriodMonth(photo.periodMonth, photo.aiInvoiceDate) ?? monthKeyFromDate();
  const monthOptions = months.includes(reportMonth) ? months : [reportMonth, ...months];
  const amount = photo.amountIls ?? photo.aiTotalIls;
  const field = (name: string) => `${name}-${photo.id}`;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{photo.originalName}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(photo.createdAt)} · {photo.source === "BULK_IMPORT" ? "ייבוא תיקייה" : "העלאה"}
            {reportMonth ? ` · ${monthLabel(reportMonth)}` : ""}
          </p>
        </div>
        <AnalyzeInvoiceButton photoId={photo.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)] md:items-start">
        <InvoiceDocumentPreview fileUrl={fileUrl} mimeType={photo.mimeType} originalName={photo.originalName} />

        <div className="space-y-3">
          <AiSuggestionCard
            photoId={photo.id}
            supplierName={photo.aiSupplierName}
            invoiceDate={photo.aiInvoiceDate}
            totalIls={photo.aiTotalIls}
            confidence={photo.aiConfidence}
            reason={photo.aiReason}
            status={photo.aiStatus}
            suggestedAccount={chartLeafMeta(photo.aiAccountId)}
          />

          <form action={saveInvoiceClassification.bind(null, photo.id)} className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={field("invoiceDate")}>תאריך חשבונית</FieldLabel>
              <Input
                id={field("invoiceDate")}
                name="invoiceDate"
                type="date"
                defaultValue={toDateInputValue(photo.aiInvoiceDate)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={field("periodMonth")}>חודש לדיווח</FieldLabel>
              <select
                id={field("periodMonth")}
                name="periodMonth"
                defaultValue={reportMonth}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {monthLabel(key)}
                  </option>
                ))}
              </select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={field("supplierName")}>שם ספק</FieldLabel>
              <Input
                id={field("supplierName")}
                name="supplierName"
                defaultValue={photo.aiSupplierName ?? ""}
                placeholder="למשל: ירקות השרון"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={field("amountIls")}>סכום כולל (₪)</FieldLabel>
              <Input
                id={field("amountIls")}
                name="amountIls"
                type="number"
                min={0}
                step="0.01"
                defaultValue={amount != null ? String(amount) : ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={field("accountId")}>קטגוריה</FieldLabel>
              <GroupedAccountSelect id={field("accountId")} defaultValue={photo.aiAccountId} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={field("note")}>הערה (אופציונלי)</FieldLabel>
              <Textarea id={field("note")} name="note" defaultValue={photo.voiceNoteText ?? ""} rows={2} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                שמירת סיווג
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
