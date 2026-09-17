"use client";

import { useMemo, useState, useTransition } from "react";
import { scanReceiptDocument } from "@/actions/receipt-scan";
import { submitGoodsReceipt } from "@/actions/receipts";
import { ReceiptAiTip } from "@/components/ai-helper-tip";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { InvoiceCaptureField } from "@/components/invoices/invoice-capture-field";
import { Button } from "@/components/ui/button";
import { CompactField, NativeSelect } from "@/components/ui/compact-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BILLED_AS, EXCEPTION_KIND } from "@/lib/constants";
import { creditAmountIls, isShortage, qtyDiffers } from "@/lib/credits";
import { DEFAULT_EXPENSE_LEAF_ID } from "@/lib/chart-of-accounts";
import { formatIls } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = {
  id: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  product: { name: string; sku: string | null };
};

type ActionChoice = (typeof EXCEPTION_KIND)[keyof typeof EXCEPTION_KIND];

export function ReceiveForm({
  orderId,
  lines,
  aiAvailable,
}: {
  orderId: string;
  lines: Line[];
  aiAvailable: boolean;
}) {
  const action = submitGoodsReceipt.bind(null, orderId);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, Math.round(line.qty)])),
  );
  const [price, setPrice] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, line.unitPrice])),
  );
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [billedAs, setBilledAs] = useState<Record<string, string>>({});
  const [mismatchAction, setMismatchAction] = useState<Record<string, ActionChoice>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [pending, startScan] = useTransition();

  const shortages = useMemo(
    () =>
      lines.filter((line) =>
        isShortage(line.qty, qty[line.id] ?? 0, Boolean(missing[line.id])),
      ),
    [lines, qty, missing],
  );

  function onPhotoChange(file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.set("photo", file);
    startScan(async () => {
      const result = await scanReceiptDocument(orderId, fd);
      setScanMessage(result.message);
      setQty((current) => {
        const next = { ...current };
        for (const row of result.lines) next[row.orderLineId] = row.receivedQty;
        return next;
      });
      setPrice((current) => {
        const next = { ...current };
        for (const row of result.lines) next[row.orderLineId] = row.invoicePrice;
        return next;
      });
    });
  }

  function continueToReview(event: React.FormEvent<HTMLFormElement>) {
    if (step === 1 && shortages.length > 0) {
      event.preventDefault();
      const missingBilled = shortages.filter((line) => !billedAs[line.id]);
      if (missingBilled.length > 0) {
        setScanMessage("לכל פריט עם כמות שונה יש לבחור אם חויבתם במלא או רק לפי מה שהתקבל.");
        return;
      }
      const nextActions: Record<string, ActionChoice> = { ...mismatchAction };
      for (const line of shortages) {
        if (nextActions[line.id]) continue;
        const billed = billedAs[line.id] ?? BILLED_AS.FULL_ORDERED;
        nextActions[line.id] =
          billed === BILLED_AS.FULL_ORDERED ? EXCEPTION_KIND.CREDIT_REQUEST : EXCEPTION_KIND.ON_THE_WAY;
      }
      setMismatchAction(nextActions);
      setStep(2);
    }
  }

  return (
    <form action={action} onSubmit={continueToReview} className="space-y-6">
      {!aiAvailable ? <AiMissingBanner /> : null}
      <ReceiptAiTip />
      {scanMessage ? <p className="text-sm text-primary">{scanMessage}</p> : null}

      <div className={cn("space-y-3", step === 2 && "hidden")}>
        {lines.map((line) => {
          const received = qty[line.id] ?? 0;
          const mismatch = qtyDiffers(line.qty, received) || Boolean(missing[line.id]);
          const shortage = isShortage(line.qty, received, Boolean(missing[line.id]));
          const billed = billedAs[line.id] ?? "";
          const orderedTotal = line.qty * (price[line.id] ?? line.unitPrice);
          const receivedTotal = received * (price[line.id] ?? line.unitPrice);
          return (
            <div
              key={line.id}
              className={cn(
                "rounded-xl border bg-card p-4",
                mismatch && "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{line.product.name}</p>
                {mismatch ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-950">
                    ? כמות שונה
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                הוזמן {line.qty} · מחיר מוסכם {formatIls(line.unitPrice)}
                {line.discountPercent ? ` · הנחה ${line.discountPercent}%` : ""}
                {line.product.sku ? ` · ${line.product.sku}` : ""}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`receivedQty:${line.id}`}>כמות שהתקבלה</FieldLabel>
                  <Input
                    id={`receivedQty:${line.id}`}
                    name={`receivedQty:${line.id}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={received}
                    onChange={(event) =>
                      setQty((current) => ({
                        ...current,
                        [line.id]: Math.round(Number(event.target.value) || 0),
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`invoicePrice:${line.id}`}>
                    מחיר בחשבונית (₪)
                    {mismatch ? " ?" : ""}
                  </FieldLabel>
                  <Input
                    id={`invoicePrice:${line.id}`}
                    name={`invoicePrice:${line.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className={mismatch ? "border-amber-400" : undefined}
                    value={price[line.id] ?? 0}
                    onChange={(event) =>
                      setPrice((current) => ({ ...current, [line.id]: Number(event.target.value) || 0 }))
                    }
                  />
                </Field>
                <CompactField label="סטטוס הגעה" htmlFor={`missing:${line.id}`}>
                  <NativeSelect
                    id={`missing:${line.id}`}
                    name={`missing:${line.id}`}
                    value={missing[line.id] ? "on" : "off"}
                    onChange={(event) =>
                      setMissing((current) => ({ ...current, [line.id]: event.target.value === "on" }))
                    }
                  >
                    <option value="off">הגיע</option>
                    <option value="on">חסר / לא הגיע</option>
                  </NativeSelect>
                </CompactField>
              </div>
              {shortage ? (
                <CompactField
                  label={`חיוב בחשבונית · מלא ${formatIls(orderedTotal)} / התקבל ${formatIls(receivedTotal)}`}
                  htmlFor={`billedAsUi:${line.id}`}
                  className="mt-3 min-w-full"
                >
                  <NativeSelect
                    id={`billedAsUi:${line.id}`}
                    value={billed}
                    required
                    onChange={(event) =>
                      setBilledAs((current) => ({ ...current, [line.id]: event.target.value }))
                    }
                  >
                    <option value="">בחירת סוג חיוב</option>
                    <option value={BILLED_AS.FULL_ORDERED}>
                      חוייבנו לפי כל הכמות שהוזמנה ({formatIls(orderedTotal)})
                    </option>
                    <option value={BILLED_AS.RECEIVED_ONLY}>
                      חוייבנו רק לפי מה שהתקבל ({formatIls(receivedTotal)})
                    </option>
                  </NativeSelect>
                </CompactField>
              ) : null}
            </div>
          );
        })}
      </div>

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20">
          <div>
            <h2 className="font-heading text-lg font-semibold">בקשת זיכוי / מעקב חוסר</h2>
            <p className="text-sm text-muted-foreground">
              בסיום הקליטה — לכל פריט חסר. אם הספק אמר שהסחורה בדרך, סמנו «בדרך» בלי בקשת זיכוי.
            </p>
          </div>
          {shortages.map((line) => {
            const received = qty[line.id] ?? 0;
            const billed = billedAs[line.id] ?? BILLED_AS.FULL_ORDERED;
            const amount = creditAmountIls(line.qty, received, price[line.id] ?? line.unitPrice, billed);
            const chosen = mismatchAction[line.id];
            return (
              <div key={line.id} className="rounded-lg border bg-card p-3 text-sm">
                <p className="font-medium">{line.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  הוזמן {line.qty} · התקבל {received}
                  {amount > 0 ? ` · הפרש ${formatIls(amount)}` : ""}
                </p>
                <input type="hidden" name={`billedAs:${line.id}`} value={billed} />
                <CompactField label="טיפול בחוסר" htmlFor={`mismatchAction:${line.id}`} className="mt-2 min-w-full">
                  <NativeSelect
                    id={`mismatchAction:${line.id}`}
                    name={`mismatchAction:${line.id}`}
                    value={chosen ?? ""}
                    required
                    onChange={(event) =>
                      setMismatchAction((current) => ({
                        ...current,
                        [line.id]: event.target.value as ActionChoice,
                      }))
                    }
                  >
                    <option value="">בחירת טיפול</option>
                    {billed === BILLED_AS.FULL_ORDERED ? (
                      <option value={EXCEPTION_KIND.CREDIT_REQUEST}>
                        בקשת זיכוי{amount > 0 ? ` · ${formatIls(amount)}` : ""}
                      </option>
                    ) : null}
                    <option value={EXCEPTION_KIND.ON_THE_WAY}>בדרך — בלי זיכוי, למעקב בדשבורד</option>
                    <option value={EXCEPTION_KIND.MISSING_NO_CREDIT}>
                      לא לבקש זיכוי (חסר ולא ביקשנו)
                    </option>
                  </NativeSelect>
                </CompactField>
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={() => setStep(1)}>
            חזרה לכמויות
          </Button>
        </div>
      ) : null}

      <div className={cn(step === 2 && "hidden")}>
        <InvoiceCaptureField required pending={pending} onFile={onPhotoChange} />

        <Field>
          <FieldLabel htmlFor="accountId">קטגוריה</FieldLabel>
          <GroupedAccountSelect id="accountId" defaultValue={DEFAULT_EXPENSE_LEAF_ID} kinds={["EXPENSE"]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">הערות קליטה</FieldLabel>
          <Textarea id="notes" name="notes" placeholder="למשל: ארגז אחד רטוב, חסר פריט" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {step === 1 && shortages.length > 0 ? "המשך לבקשת זיכוי" : "שמירת קליטה"}
      </Button>
    </form>
  );
}
