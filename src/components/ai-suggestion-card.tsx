import { confirmAiSuggestion } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { isLowConfidence } from "@/lib/ai";
import { formatIls } from "@/lib/format";

type Props = {
  photoId: string;
  supplierName: string | null;
  invoiceDate: string | null;
  totalIls: number | null;
  confidence: number | null;
  reason: string | null;
  status: string | null;
  suggestedAccount: { code: string; name: string; parentName: string } | null;
};

export function AiSuggestionCard({
  photoId,
  supplierName,
  invoiceDate,
  totalIls,
  confidence,
  reason,
  status,
  suggestedAccount,
}: Props) {
  if (status === "skipped_no_key" || status === "SKIPPED_NO_KEY") {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        אין מפתח AI — שייכו ידנית.
      </div>
    );
  }
  if (status === "budget" || status === "BUDGET") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        הגעתם לתקרת התקציב החודשית של AI. שייכו ידנית.
      </div>
    );
  }
  if (status === "error" || status === "FAILED") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        ניתוח AI נכשל. שייכו ידנית.
        {reason ? <span className="mt-1 block text-muted-foreground">{reason}</span> : null}
      </div>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
        אושר לפי הצעת AI
        {confidence != null ? ` · ביטחון ${Math.round(confidence * 100)}%` : ""}
      </div>
    );
  }
  if (!suggestedAccount && !supplierName) return null;

  const low = isLowConfidence(confidence);

  return (
    <div
      className={`space-y-2 rounded-lg border px-3 py-3 text-sm ${
        low ? "border-amber-400 bg-amber-50" : "border-emerald-200 bg-emerald-50/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">הצעת AI</p>
        {confidence != null ? (
          <span className="text-xs text-muted-foreground">
            ביטחון {Math.round(confidence * 100)}%
          </span>
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
            <dt className="text-muted-foreground">ספק</dt>
            <dd>{supplierName}</dd>
          </div>
        ) : null}
        {invoiceDate ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">תאריך</dt>
            <dd dir="ltr">{invoiceDate}</dd>
          </div>
        ) : null}
        {totalIls != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">סכום</dt>
            <dd>{formatIls(totalIls)}</dd>
          </div>
        ) : null}
        {suggestedAccount ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">כרטיס</dt>
            <dd>
              {suggestedAccount.parentName} · {suggestedAccount.code} {suggestedAccount.name}
            </dd>
          </div>
        ) : (
          <p className="text-muted-foreground">לא זוהה כרטיס מתאים.</p>
        )}
      </dl>
      {reason ? <p className="text-xs text-muted-foreground">{reason}</p> : null}
      {suggestedAccount ? (
        <form action={confirmAiSuggestion.bind(null, photoId)}>
          <Button type="submit" size="sm" className="w-full">
            אשר הצעה
          </Button>
        </form>
      ) : null}
    </div>
  );
}
