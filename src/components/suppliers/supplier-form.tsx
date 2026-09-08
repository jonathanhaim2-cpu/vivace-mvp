import { createSupplier, updateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPES, WEEKDAYS } from "@/lib/constants";
import { parseDeliveryDays } from "@/lib/format";
import { CategorySelect } from "@/components/categories/category-select";

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
};

export function SupplierForm({
  supplier,
  categoryTree = [],
}: {
  supplier?: SupplierValues & { id: string };
  categoryTree?: { id: string; name: string; children: { id: string; name: string }[] }[];
}) {
  const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier;
  const days = supplier ? parseDeliveryDays(supplier.deliveryDays) : [0, 2, 4];

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
            <FieldDescription>המספר ישמש לקישור wa.me בעת שליחת הזמנה.</FieldDescription>
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
            <FieldDescription>במשולב לפי מוצר אפשר להגדיר סוג מסמך בכל פריט.</FieldDescription>
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
            <FieldDescription>
              במערכת זו התזכורת מוצגת במסך ההזמנה. שליחה אמיתית תתווסף בשלב הבא.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="weeklyBudgetIls">תקציב הזמנה שבועי לסניף (₪, אופציונלי)</FieldLabel>
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
          <FieldDescription>מוצע אוטומטית במוצר חדש אצל הספק.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">הערות</FieldLabel>
          <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} rows={3} />
        </Field>
      </FieldGroup>

      <Button type="submit">{supplier ? "שמירת ספק" : "יצירת ספק"}</Button>
    </form>
  );
}
