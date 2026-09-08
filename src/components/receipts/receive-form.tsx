"use client";

import { useState, useTransition } from "react";
import { scanReceiptDocument } from "@/actions/receipt-scan";
import { submitGoodsReceipt } from "@/actions/receipts";
import { AiMissingBanner } from "@/components/ai-missing-banner";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_EXPENSE_LEAF_ID } from "@/lib/chart-of-accounts";
import { formatIls } from "@/lib/format";

type Line = {
  id: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  product: { name: string; sku: string | null };
};

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
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [pending, startScan] = useTransition();

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

  return (
    <form action={action} className="space-y-6">
      {!aiAvailable ? <AiMissingBanner /> : null}
      {scanMessage ? <p className="text-sm text-primary">{scanMessage}</p> : null}

      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.id} className="rounded-xl border bg-card p-4">
            <p className="font-medium">{line.product.name}</p>
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
                  value={qty[line.id] ?? 0}
                  onChange={(event) =>
                    setQty((current) => ({ ...current, [line.id]: Math.round(Number(event.target.value) || 0) }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`invoicePrice:${line.id}`}>מחיר בחשבונית (₪)</FieldLabel>
                <Input
                  id={`invoicePrice:${line.id}`}
                  name={`invoicePrice:${line.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={price[line.id] ?? 0}
                  onChange={(event) =>
                    setPrice((current) => ({ ...current, [line.id]: Number(event.target.value) || 0 }))
                  }
                />
              </Field>
              <label className="flex items-end gap-2 pb-1 text-sm">
                <input type="checkbox" name={`missing:${line.id}`} />
                מוצר חסר / לא הגיע
              </label>
            </div>
          </div>
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="photo">צילום חשבונית / תעודת משלוח</FieldLabel>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/*,application/pdf"
          required
          onChange={(event) => onPhotoChange(event.target.files?.[0] ?? null)}
        />
        <FieldDescription>
          {pending
            ? "סורק את המסמך וממלא כמויות..."
            : "העלאה ממלאת כמויות ומחירים מהמסמך כשאפשר. העובד מאשר בעיקר כמויות. חובה לשמור את הקובץ."}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="accountId">כרטיס הנה״ח (בן)</FieldLabel>
        <GroupedAccountSelect id="accountId" defaultValue={DEFAULT_EXPENSE_LEAF_ID} kinds={["EXPENSE"]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="notes">הערות קליטה</FieldLabel>
        <Textarea id="notes" name="notes" placeholder="למשל: ארגז אחד רטוב, חסר פריט" />
      </Field>

      <Button type="submit" disabled={pending}>
        שמירת קליטה
      </Button>
    </form>
  );
}
