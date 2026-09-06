import { submitGoodsReceipt } from "@/actions/receipts";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GroupedAccountSelect } from "@/components/accounts/grouped-account-select";
import { DEFAULT_EXPENSE_LEAF_ID } from "@/lib/chart-of-accounts";
import { formatIls } from "@/lib/format";

type Line = {
  id: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  product: { name: string; sku: string | null };
};

export function ReceiveForm({ orderId, lines }: { orderId: string; lines: Line[] }) {
  const action = submitGoodsReceipt.bind(null, orderId);

  return (
    <form action={action} className="space-y-6">
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
                  defaultValue={Math.round(line.qty)}
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
                  defaultValue={line.unitPrice}
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
        <Input id="photo" name="photo" type="file" accept="image/*,application/pdf" required />
        <FieldDescription>חובה. הקובץ נשמר מקומית בתיקיית uploads של הסביבה.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="accountId">כרטיס הנה״ח (בן)</FieldLabel>
        <GroupedAccountSelect id="accountId" defaultValue={DEFAULT_EXPENSE_LEAF_ID} kinds={["EXPENSE"]} />
        <FieldDescription>השיוך הוא תמיד לכרטיס בן. סיכום לקטגוריית האב מופיע בחשבוניות.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="notes">הערות קליטה</FieldLabel>
        <Textarea id="notes" name="notes" placeholder="למשל: ארגז אחד רטוב, חסר פריט" />
      </Field>

      <Button type="submit">שמירת קליטה</Button>
    </form>
  );
}
