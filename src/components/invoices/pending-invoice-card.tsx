import { saveInvoiceClassification } from "@/actions/invoices";
import { AuditInfoButton } from "@/components/audit-info-button";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { AiSuggestionCard } from "@/components/ai-suggestion-card";
import { AnalyzeInvoiceButton } from "@/components/analyze-invoice-button";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { DiscardInvoiceButton } from "@/components/invoices/discard-invoice-button";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import { DocumentTypeBadge, DocumentTypeSelect } from "@/components/invoices/document-type-control";
import { InvoiceAmountFields } from "@/components/invoices/invoice-amount-fields";
import { Button } from "@/components/ui/button";
import { isAiNotInvoiceSuggestion } from "@/lib/invoice-discard";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { chartLeafMeta } from "@/lib/chart-of-accounts";
import { invoiceSourceLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { toDateInputValue } from "@/lib/invoice-form";
import { invoiceBranchSelectValue } from "@/lib/invoice-branch";
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
  branchId: string | null;
  documentType: string;
  aiDocumentType: string | null;
  aiBranchId: string | null;
  aiNetworkExpense: boolean;
  vatIncluded?: boolean;
};

export function PendingInvoiceCard({
  photo,
  months,
  auditStamp,
  branches,
  returnTo,
}: {
  photo: PendingInvoicePhoto;
  months: string[];
  auditStamp: string;
  branches: BranchOption[];
  returnTo?: string;
}) {
  const fileUrl = publicFileUrl(photo.fileName);
  const reportMonth = resolvedPeriodMonth(photo.periodMonth, photo.aiInvoiceDate) ?? monthKeyFromDate();
  const monthOptions = months.includes(reportMonth) ? months : [reportMonth, ...months];
  const amount = photo.amountIls ?? photo.aiTotalIls;
  const field = (name: string) => `${name}-${photo.id}`;
  const formId = `classify-${photo.id}`;
  const notInvoice = isAiNotInvoiceSuggestion(photo);
  const branchSelectValue = invoiceBranchSelectValue({
    aiBranchId: photo.aiBranchId,
    aiNetworkExpense: photo.aiNetworkExpense,
    branchId: photo.branchId,
  });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-0.5">
          <div className="min-w-0">
            <p className="font-medium">{photo.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(photo.createdAt)} · {invoiceSourceLabel(photo.source)}
              {reportMonth ? ` · ${monthLabel(reportMonth)}` : ""}
            </p>
            <div className="mt-1">
              <DocumentTypeBadge value={photo.documentType} />
            </div>
          </div>
          <AuditInfoButton stamp={auditStamp} />
        </div>
        <AnalyzeInvoiceButton photoId={photo.id} returnTo={returnTo} />
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
            documentType={photo.aiDocumentType ?? photo.documentType}
            suggestedAccount={chartLeafMeta(photo.aiAccountId)}
            branches={branches}
            defaultBranchId={branchSelectValue}
            suggestedBranchId={photo.aiBranchId}
            suggestedNetwork={photo.aiNetworkExpense}
          />

          <form
            id={formId}
            action={saveInvoiceClassification.bind(null, photo.id)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field>
              <FieldLabel htmlFor={field("invoiceDate")}>תאריך חשבונית</FieldLabel>
              <Input
                id={field("invoiceDate")}
                name="invoiceDate"
                type="date"
                lang="he-IL"
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
            <InvoiceAmountFields
              idPrefix={`${photo.id}-`}
              defaultAmount={amount}
              defaultType={photo.documentType || photo.aiDocumentType}
              defaultVatIncluded={photo.vatIncluded !== false}
            />
            <Field>
              <FieldLabel htmlFor={field("accountId")}>קטגוריה</FieldLabel>
              <GroupedAccountSelect id={field("accountId")} defaultValue={photo.aiAccountId} />
            </Field>
            <Field>
              <FieldLabel htmlFor={field("documentType")}>סוג מסמך</FieldLabel>
              <DocumentTypeSelect
                id={field("documentType")}
                defaultValue={photo.documentType || photo.aiDocumentType}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={field("branchId")}>סניף</FieldLabel>
              <BranchSelect
                id={field("branchId")}
                branches={branches}
                defaultValue={branchSelectValue}
                required
                allowEmpty={!branchSelectValue}
                allowNetwork
                emptyLabel="בחירת סניף"
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={field("note")}>הערה (אופציונלי)</FieldLabel>
              <Textarea id={field("note")} name="note" defaultValue={photo.voiceNoteText ?? ""} rows={2} />
            </Field>
          </form>
          {notInvoice ? (
            <p className="text-xs font-medium text-amber-800">
              ה-AI סימן שזה אינו חשבונית — אפשר להסיר מהתור בלי לשבץ.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {notInvoice ? <DiscardInvoiceButton photoId={photo.id} notInvoice /> : null}
            <Button type="submit" form={formId} size="sm" variant={notInvoice ? "outline" : "default"}>
              שמירת סיווג
            </Button>
            {notInvoice ? null : <DiscardInvoiceButton photoId={photo.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
