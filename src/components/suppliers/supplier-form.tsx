import { createSupplier, updateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { CompactField, NativeSelect } from "@/components/ui/compact-form";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/categories/category-select";
import { PlantsCouncilSupplierFields } from "@/components/suppliers/plants-council-fields";
import { SupplierBranchPicker } from "@/components/suppliers/supplier-branch-picker";
import { DOCUMENT_TYPES, PAYMENT_METHODS, PAYMENT_TERMS, WEEKDAYS } from "@/lib/constants";
import { parseDeliveryDays, parseWeekdays } from "@/lib/format";

type SupplierValues = {
  name: string;
  taxId: string | null;
  agentName: string | null;
  agentPhone: string | null;
  whatsappPhone: string;
  driverName: string | null;
  address?: string | null;
  deliveryPointNumber?: string | null;
  documentType: string;
  deliveryDays: string;
  orderDays?: string | null;
  orderCutoffTime: string;
  reminderHoursBefore: number;
  weeklyBudgetIls: number | null;
  minimumOrderIls?: number | null;
  notes: string | null;
  defaultCategoryId: string | null;
  active: boolean;
  paymentTerms: string | null;
  paymentMethod: string | null;
  accountingPhone: string | null;
  accountingEmail: string | null;
  paymentChargeDay?: number | null;
  card1Label?: string | null;
  card2Label?: string | null;
  plantsCouncilUrl: string | null;
  plantsCouncilDiscountPct: number | null;
  plantsCouncilRelevant?: boolean;
  branchLinks?: {
    branchId: string;
    whatsappPhone?: string | null;
    taxId?: string | null;
    driverName?: string | null;
    agentName?: string | null;
    agentPhone?: string | null;
    deliveryDays?: string | null;
    orderDays?: string | null;
    orderCutoffTime?: string | null;
    catalogKind?: string | null;
    notes?: string | null;
    paymentMethod?: string | null;
    paymentChargeDay?: number | null;
  }[];
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
  const orderDays = supplier ? parseWeekdays(supplier.orderDays) : days;
  const selectedBranches = supplier?.branchLinks?.map((link) => link.branchId) ?? [];
  const branchPhones = Object.fromEntries(
    (supplier?.branchLinks ?? []).map((link) => [link.branchId, link.whatsappPhone ?? ""]),
  );
  const branchLinkDefaults = Object.fromEntries((supplier?.branchLinks ?? []).map((link) => [link.branchId, link]));
  const weekdayOptions = WEEKDAYS.map((day) => ({ value: String(day.value), label: day.label }));

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="name">שם החברה</FieldLabel>
          <Input id="name" name="name" required defaultValue={supplier?.name} placeholder="תנובה" />
        </Field>
        <Field>
          <FieldLabel htmlFor="taxId">ח.פ. / עוסק מורשה</FieldLabel>
          <Input id="taxId" name="taxId" defaultValue={supplier?.taxId ?? ""} placeholder="520004078" />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">כתובת הספק</FieldLabel>
          <Input id="address" name="address" defaultValue={supplier?.address ?? ""} placeholder="רחוב, עיר" />
        </Field>
        <Field>
          <FieldLabel htmlFor="deliveryPointNumber">מספר נקודת חלוקה</FieldLabel>
          <Input
            id="deliveryPointNumber"
            name="deliveryPointNumber"
            defaultValue={supplier?.deliveryPointNumber ?? ""}
            placeholder="אופציונלי"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="active">סטטוס</FieldLabel>
          <NativeSelect id="active" name="active" defaultValue={supplier?.active === false ? "false" : "true"}>
            <option value="true">פעיל</option>
            <option value="false">לא פעיל</option>
          </NativeSelect>
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
            placeholder="0526408537"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="driverName">שם מפיץ</FieldLabel>
          <Input id="driverName" name="driverName" defaultValue={supplier?.driverName ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="documentType">סוג מסמך</FieldLabel>
          <NativeSelect id="documentType" name="documentType" defaultValue={supplier?.documentType ?? "TAX_INVOICE"}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="orderCutoffTime">שעת סגירת הזמנה</FieldLabel>
          <Input
            id="orderCutoffTime"
            name="orderCutoffTime"
            type="time"
            dir="ltr"
            lang="en-GB"
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
        <Field>
          <FieldLabel htmlFor="minimumOrderIls">מינימום הזמנה (₪)</FieldLabel>
          <Input
            id="minimumOrderIls"
            name="minimumOrderIls"
            type="number"
            min={0}
            step="0.01"
            defaultValue={supplier?.minimumOrderIls ?? ""}
          />
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
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <CompactField label="ימי אספקה" htmlFor="delivery-days" hint="מתי הסחורה מגיעה למסעדה." className="min-w-[12rem]">
          <CompactMultiSelect
            id="delivery-days"
            name="deliveryDay"
            options={weekdayOptions}
            defaultValue={days.map(String)}
            placeholder="בחירת ימים"
          />
        </CompactField>
        <CompactField
          label="ימי הזמנה"
          htmlFor="order-days"
          hint="מתי אפשר להזמין. שעת הסגירה חלה על ימי ההזמנה. אם לא נבחרו ימים — משתמשים בימי האספקה."
          className="min-w-[12rem]"
        >
          <CompactMultiSelect
            id="order-days"
            name="orderDay"
            options={weekdayOptions}
            defaultValue={orderDays.map(String)}
            placeholder="בחירת ימים"
          />
        </CompactField>
      </div>

      <details className="rounded-xl border bg-card px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium">כספים והנה״ח</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="paymentTerms">תנאי תשלום</FieldLabel>
            <NativeSelect id="paymentTerms" name="paymentTerms" defaultValue={supplier?.paymentTerms ?? ""}>
              <option value="">לא הוגדר</option>
              {PAYMENT_TERMS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="paymentMethod">אמצעי תשלום</FieldLabel>
            <NativeSelect id="paymentMethod" name="paymentMethod" defaultValue={supplier?.paymentMethod ?? ""}>
              <option value="">לא הוגדר</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="paymentChargeDay">יום חיוב בחודש</FieldLabel>
            <Input
              id="paymentChargeDay"
              name="paymentChargeDay"
              type="number"
              min={1}
              max={28}
              defaultValue={supplier?.paymentChargeDay ?? ""}
              placeholder="15"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="card1Label">כרטיס 1</FieldLabel>
            <Input id="card1Label" name="card1Label" defaultValue={supplier?.card1Label ?? ""} placeholder="ויזה 12" />
          </Field>
          <Field>
            <FieldLabel htmlFor="card2Label">כרטיס 2</FieldLabel>
            <Input id="card2Label" name="card2Label" defaultValue={supplier?.card2Label ?? ""} placeholder="מקס 34" />
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
        </div>
      </details>

      <details className="rounded-xl border bg-card px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium">סניפים + מועצת הצמחים</summary>
        <div className="mt-3 space-y-3">
          <SupplierBranchPicker
            branches={branches}
            defaultSelected={selectedBranches}
            defaultPhones={branchPhones}
            defaultLinks={branchLinkDefaults}
          />
          <PlantsCouncilSupplierFields
            relevant={supplier?.plantsCouncilRelevant ?? false}
            url={supplier?.plantsCouncilUrl}
            discountPct={supplier?.plantsCouncilDiscountPct}
          />
        </div>
      </details>

      <Field>
        <FieldLabel htmlFor="notes">הערות</FieldLabel>
        <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} rows={2} />
      </Field>

      <Button type="submit">{supplier ? "שמירת ספק" : "יצירת ספק"}</Button>
    </form>
  );
}
