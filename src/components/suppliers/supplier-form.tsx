import { createSupplier, updateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/categories/category-select";
import { DOCUMENT_TYPES, PAYMENT_METHODS, PAYMENT_TERMS, WEEKDAYS } from "@/lib/constants";
import { parseDeliveryDays } from "@/lib/format";
import { PLANTS_COUNCIL } from "@/lib/plants-council";

type SupplierValues = {
  name: string;
  taxId: string | null;
  agentName: string | null;
  agentPhone: string | null;
  whatsappPhone: string;
  driverName: string | null;
  documentType: string;
  deliveryDays: string;
  orderCutoffTime: string;
  reminderHoursBefore: number;
  weeklyBudgetIls: number | null;
  notes: string | null;
  defaultCategoryId: string | null;
  active: boolean;
  paymentTerms: string | null;
  paymentMethod: string | null;
  accountingPhone: string | null;
  accountingEmail: string | null;
  partnerName: string | null;
  partnerPercent: number | null;
  plantsCouncilUrl: string | null;
  plantsCouncilDiscountPct: number | null;
  branchLinks?: { branchId: string }[];
};

export function SupplierForm({
  supplier,
  categoryTree = [],
  branches = [],
}: {
  supplier?: SupplierValues & { id: string };
  categoryTree?: { id: string; name: string; children: { id: string; name: string }[] }[];
  branches?: { id: string; name: string }[];
}) {
  const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier;
  const days = supplier ? parseDeliveryDays(supplier.deliveryDays) : [0, 2, 4];
  const selectedBranches = new Set(supplier?.branchLinks?.map((link) => link.branchId) ?? branches.map((b) => b.id));

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">שם החברה</FieldLabel>
            <Input id="name" name="name" required defaultValue={supplier?.name} placeholder="תנובה" />
          </Field>
          <Field>
            <FieldLabel htmlFor="taxId">ח.פ. / עוסק מורשה</FieldLabel>
            <Input id="taxId" name="taxId" defaultValue={supplier?.taxId ?? ""} placeholder="520004078" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="hidden" name="active" value="false" />
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={supplier?.active ?? true}
            />
            ספק פעיל (לא פעיל מוסתר מהזמנות סניף, נשאר במשרד הרשת)
          </label>
          <Field>
            <FieldLabel htmlFor="agentName">שם סוכן</FieldLabel>
            <Input id="agentName" name="agentName" defaultValue={supplier?.agentName ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="agentPhone">טלפון סוכן</FieldLabel>
            <Input id="agentPhone" name="agentPhone" defaultValue={supplier?.agentPhone ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="whatsappPhone">וואטסאפ לקבלת הזמנות</FieldLabel>
            <Input
              id="whatsappPhone"
              name="whatsappPhone"
              required
              defaultValue={supplier?.whatsappPhone}
              placeholder="0501234567"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="driverName">שם נהג</FieldLabel>
            <Input id="driverName" name="driverName" defaultValue={supplier?.driverName ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="documentType">סוג מסמך</FieldLabel>
            <select
              id="documentType"
              name="documentType"
              defaultValue={supplier?.documentType ?? "TAX_INVOICE"}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="orderCutoffTime">שעת סגירת הזמנה</FieldLabel>
            <Input
              id="orderCutoffTime"
              name="orderCutoffTime"
              type="time"
              required
              defaultValue={supplier?.orderCutoffTime ?? "14:00"}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="reminderHoursBefore">תזכורת לפני סגירה (שעות)</FieldLabel>
            <Input
              id="reminderHoursBefore"
              name="reminderHoursBefore"
              type="number"
              min={0}
              max={24}
              defaultValue={supplier?.reminderHoursBefore ?? 2}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="weeklyBudgetIls">תקציב הזמנה שבועי לסניף (₪)</FieldLabel>
            <Input
              id="weeklyBudgetIls"
              name="weeklyBudgetIls"
              type="number"
              min={0}
              step="0.01"
              defaultValue={supplier?.weeklyBudgetIls ?? ""}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>ימי אספקה</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  name="deliveryDay"
                  value={day.value}
                  defaultChecked={days.includes(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="defaultCategoryId">קטגוריית ברירת מחדל</FieldLabel>
          <CategorySelect
            id="defaultCategoryId"
            name="defaultCategoryId"
            tree={categoryTree}
            defaultValue={supplier?.defaultCategoryId}
            emptyLabel="ללא"
          />
        </Field>
      </FieldGroup>

      <details className="rounded-xl border bg-card p-4" open>
        <summary className="cursor-pointer font-medium">כספים, הנה״ח ושותפות</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="paymentTerms">תנאי תשלום</FieldLabel>
            <select
              id="paymentTerms"
              name="paymentTerms"
              defaultValue={supplier?.paymentTerms ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">לא הוגדר</option>
              {PAYMENT_TERMS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="paymentMethod">אמצעי תשלום</FieldLabel>
            <select
              id="paymentMethod"
              name="paymentMethod"
              defaultValue={supplier?.paymentMethod ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">לא הוגדר</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="accountingPhone">טלפון הנה״ח</FieldLabel>
            <Input id="accountingPhone" name="accountingPhone" defaultValue={supplier?.accountingPhone ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="accountingEmail">מייל הנה״ח</FieldLabel>
            <Input
              id="accountingEmail"
              name="accountingEmail"
              type="email"
              defaultValue={supplier?.accountingEmail ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="partnerName">שם שותף / בעלות</FieldLabel>
            <Input id="partnerName" name="partnerName" defaultValue={supplier?.partnerName ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="partnerPercent">אחוז שותפות</FieldLabel>
            <Input
              id="partnerPercent"
              name="partnerPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={supplier?.partnerPercent ?? ""}
            />
          </Field>
        </div>
      </details>

      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">סניפים + מועצת הצמחים</summary>
        <div className="mt-4 space-y-4">
          <Field>
            <FieldLabel>זמין בסניפים</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <label key={branch.id} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="branchId"
                    value={branch.id}
                    defaultChecked={selectedBranches.has(branch.id)}
                  />
                  {branch.name}
                </label>
              ))}
            </div>
            <FieldDescription>אם לא נבחר אף סניף — הספק זמין לכולם.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="plantsCouncilUrl">קישור מחירון {PLANTS_COUNCIL.nameHe}</FieldLabel>
            <Input
              id="plantsCouncilUrl"
              name="plantsCouncilUrl"
              defaultValue={supplier?.plantsCouncilUrl ?? ""}
              placeholder={PLANTS_COUNCIL.defaultUrl}
            />
            <FieldDescription>{PLANTS_COUNCIL.noteHe}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="plantsCouncilDiscountPct">% מתחת למחירון המועצה</FieldLabel>
            <Input
              id="plantsCouncilDiscountPct"
              name="plantsCouncilDiscountPct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={supplier?.plantsCouncilDiscountPct ?? ""}
              placeholder="10"
            />
          </Field>
        </div>
      </details>

      <Field>
        <FieldLabel htmlFor="notes">הערות</FieldLabel>
        <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} rows={3} />
      </Field>

      <Button type="submit">{supplier ? "שמירת ספק" : "יצירת ספק"}</Button>
    </form>
  );
}
