import { confirmAiSuggestion } from "@/actions/invoices";
import { BranchSelect, type BranchOption } from "@/components/branches/branch-select";
import { Button } from "@/components/ui/button";
import { DocumentTypeSelect } from "@/components/invoices/document-type-control";
import { isLowConfidence } from "@/lib/ai";
import { AI_QUOTA_MESSAGE } from "@/lib/ai-throttle";
import { photoDocumentTypeLabel } from "@/lib/constants";
import { formatIls } from "@/lib/format";
import { NETWORK_BRANCH_LABEL, NETWORK_BRANCH_SHORT_LABEL, NETWORK_BRANCH_VALUE } from "@/lib/invoice-branch";

type Props = {
  photoId: string;
  supplierName: string | null;
  invoiceDate: string | null;
  totalIls: number | null;
  confidence: number | null;
  reason: string | null;
  status: string | null;
  documentType?: string | null;
  suggestedAccount: { code: string; name: string; parentName: string } | null;
  branches?: BranchOption[];
  defaultBranchId?: string | null;
  suggestedBranchId?: string | null;
  suggestedNetwork?: boolean;
};

export function AiSuggestionCard({
  photoId,
  supplierName,
  invoiceDate,
  totalIls,
  confidence,
  reason,
  status,
  documentType,
  suggestedAccount,
  branches = [],
  defaultBranchId,
  suggestedBranchId,
  suggestedNetwork = false,
}: Props) {
  const statusKey = (status ?? "").trim().toUpperCase();
  if (statusKey === "SKIPPED_NO_KEY") {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        אין מפתח AI — שייכו ידנית.
      </div>
    );
  }
  if (statusKey === "BUDGET") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        הגעתם לתקרת התקציב החודשית של AI. שייכו ידנית.
      </div>
    );
  }
  if (statusKey === "ERROR" || statusKey === "FAILED") {
    if (reason === AI_QUOTA_MESSAGE) {
      return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {AI_QUOTA_MESSAGE}
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        ניתוח AI נכשל. שייכו ידנית.
        {reason ? <span className="mt-1 block text-muted-foreground">{reason}</span> : null}
      </div>
    );
  }
  if (statusKey === "CONFIRMED") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
        אושר לפי הצעת AI
        {confidence != null ? ` · ביטחון ${Math.round(confidence * 100)}%` : ""}
      </div>
    );
  }
  const hasSuggestion =
    Boolean(suggestedAccount) ||
    Boolean(supplierName) ||
    Boolean(invoiceDate) ||
    totalIls != null ||
    Boolean(reason) ||
    confidence != null ||
    (statusKey === "SUGGESTED" && Boolean(documentType));
  if (!hasSuggestion) {
    if (!statusKey) return null;
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        ניתוח AI לא החזיר פרטים. שייכו ידנית.
      </div>
    );
  }

  const low = isLowConfidence(confidence);
  const suggestedBranchName = suggestedNetwork
    ? NETWORK_BRANCH_SHORT_LABEL
    : branches.find((branch) => branch.id === suggestedBranchId)?.name ?? null;
  const branchSelectValue = defaultBranchId ?? (suggestedNetwork ? NETWORK_BRANCH_VALUE : suggestedBranchId) ?? "";
  const panelClass = low ? "border-amber-400 bg-amber-50" : "border-emerald-200 bg-emerald-50";

  return (
    <div
      data-tone={low ? "low" : "ok"}
      className={`ai-suggestion-surface space-y-2 rounded-lg border px-3 py-3 text-sm ${panelClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="ai-suggestion-title font-medium">הצעת AI</p>
        {confidence != null ? (
          <span className="ai-suggestion-muted text-xs">ביטחון {Math.round(confidence * 100)}%</span>
        ) : null}
      </div>
      {low ? (
        <p className="text-xs font-medium text-amber-800">
          ביטחון נמוך — נא לבדוק לפני אישור (כפי שרועי ביקש).
        </p>
      ) : null}
      <dl className="grid gap-1 text-xs">
        {supplierName ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">ספק</dt>
            <dd className="ai-suggestion-value">{supplierName}</dd>
          </div>
        ) : null}
        {invoiceDate ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">תאריך</dt>
            <dd className="ai-suggestion-value" dir="ltr">
              {invoiceDate}
            </dd>
          </div>
        ) : null}
        {totalIls != null ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">סכום</dt>
            <dd className="ai-suggestion-value">{formatIls(totalIls)}</dd>
          </div>
        ) : null}
        {documentType && !suggestedAccount ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">סוג</dt>
            <dd className="ai-suggestion-value">{photoDocumentTypeLabel(documentType)}</dd>
          </div>
        ) : null}
        {suggestedAccount ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">קטגוריה</dt>
            <dd className="ai-suggestion-value">
              {suggestedAccount.parentName} · {suggestedAccount.code} {suggestedAccount.name}
            </dd>
          </div>
        ) : (
          <p className="ai-suggestion-muted">לא זוהתה קטגוריה מתאימה.</p>
        )}
        {suggestedBranchName ? (
          <div className="flex justify-between gap-2">
            <dt className="ai-suggestion-muted">סניף</dt>
            <dd className="ai-suggestion-value">{suggestedNetwork ? NETWORK_BRANCH_LABEL : suggestedBranchName}</dd>
          </div>
        ) : (
          <p className="ai-suggestion-muted">לא זוהה סניף במסמך.</p>
        )}
      </dl>
      {reason ? <p className="ai-suggestion-muted text-xs">{reason}</p> : null}
      {suggestedAccount ? (
        <form action={confirmAiSuggestion.bind(null, photoId)} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={`ai-type-${photoId}`} className="ai-suggestion-muted block text-[11px] font-medium">
                סוג מסמך
              </label>
              <DocumentTypeSelect
                id={`ai-type-${photoId}`}
                defaultValue={documentType}
                className="ai-suggestion-control"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`ai-branch-${photoId}`} className="ai-suggestion-muted block text-[11px] font-medium">
                סניף
              </label>
              <BranchSelect
                id={`ai-branch-${photoId}`}
                className="ai-suggestion-control"
                branches={branches}
                defaultValue={branchSelectValue}
                required
                allowEmpty={!branchSelectValue}
                allowNetwork
                emptyLabel="בחירת סניף"
              />
            </div>
          </div>
          <Button type="submit" size="sm" className="w-full">
            אשר הצעה
          </Button>
        </form>
      ) : null}
    </div>
  );
}
