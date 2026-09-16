import { createProduct, updateProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/compact-form";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/categories/category-select";
import { PlantsCouncilProductField } from "@/components/suppliers/plants-council-fields";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { afterDiscount, beforeVat, packUnits } from "@/lib/pricing";
import { formatIls } from "@/lib/format";

type ProductValues = {
  name: string;
  sku: string | null;
  notes: string | null;
  categoryId: string | null;
  stockStandard: number;
  agreedPrice: number;
  discountPercent: number;
  vatIncluded: boolean;
  cartonToBags: number | null;
  bagsToUnits: number | null;
  packagingNotes: string | null;
  documentType: string | null;
  networkRebatePercent: number;
  networkPlusPercent: number;
  plantsCouncilRelevant?: boolean | null;
};

export function ProductForm({
  supplierId,
  mixDocuments,
  product,
  categoryTree,
  defaultCategoryId,
  isNetwork,
  supplierPlantsCouncilRelevant = false,
}: {
  supplierId: string;
  mixDocuments: boolean;
  product?: ProductValues & { id: string };
  categoryTree: { id: string; name: string; children: { id: string; name: string }[] }[];
  defaultCategoryId?: string | null;
  isNetwork: boolean;
  supplierPlantsCouncilRelevant?: boolean;
}) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct.bind(null, supplierId);
  const listPrice = product?.agreedPrice ?? 0;
  const discount = product?.discountPercent ?? 0;
  const after = afterDiscount(listPrice, discount);
  const pack = packUnits(product?.cartonToBags, product?.bagsToUnits);

  return (
    <form action={action} className="space-y-4">
      <FieldGroup>
        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="name">שם מוצר</FieldLabel>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sku">מק״ט</FieldLabel>
            <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="categoryId">קטגוריה / תת־קטגוריה (אפשר גם קטגוריית אב)</FieldLabel>
            <CategorySelect
              id="categoryId"
              tree={categoryTree}
              defaultValue={product?.categoryId ?? defaultCategoryId ?? ""}
            emptyLabel="ללא — אפשר קטגוריית אב או תת־קטגוריה"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="stockStandard">מלאי תקן בין משלוחים</FieldLabel>
            <Input
              id="stockStandard"
              name="stockStandard"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={product?.stockStandard ?? 1}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="agreedPrice">מחיר לפני מע״מ / מחירון זכיין (₪)</FieldLabel>
            <Input
              id="agreedPrice"
              name="agreedPrice"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={product?.agreedPrice ?? ""}
            />
            <FieldDescription>
              זה המחיר שהסניף רואה. אם מסומן כולל מע״מ, לפני מע״מ מחושב אוטומטית.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="discountPercent">הנחה %</FieldLabel>
            <Input
              id="discountPercent"
              name="discountPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={product?.discountPercent ?? 0}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vatIncluded">מע״מ</FieldLabel>
            <NativeSelect id="vatIncluded" name="vatIncluded" defaultValue={product?.vatIncluded === false ? "false" : "true"}>
              <option value="true">כולל מע״מ</option>
              <option value="false">לפני מע״מ</option>
            </NativeSelect>
            {product ? (
              <FieldDescription>
                לפני מע״מ {formatIls(beforeVat(listPrice, product.vatIncluded))} · אחרי הנחה{" "}
                {formatIls(after)}
                {pack > 1 ? ` · קרטון ${formatIls(after * pack)} (${formatIls(after)} × ${pack})` : ""}
              </FieldDescription>
            ) : null}
          </Field>
          {isNetwork ? (
            <>
              <Field>
                <FieldLabel htmlFor="networkRebatePercent">ריבייט רשת % (מוסתר מסניף)</FieldLabel>
                <Input
                  id="networkRebatePercent"
                  name="networkRebatePercent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  defaultValue={product?.networkRebatePercent ?? 0}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="networkPlusPercent">פלוס רשת % (מוסתר מסניף)</FieldLabel>
                <Input
                  id="networkPlusPercent"
                  name="networkPlusPercent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  defaultValue={product?.networkPlusPercent ?? 0}
                />
              </Field>
            </>
          ) : (
            <>
              <input type="hidden" name="networkRebatePercent" value={product?.networkRebatePercent ?? 0} />
              <input type="hidden" name="networkPlusPercent" value={product?.networkPlusPercent ?? 0} />
            </>
          )}
          <Field>
            <FieldLabel htmlFor="cartonToBags">קרטון → שקיות</FieldLabel>
            <Input
              id="cartonToBags"
              name="cartonToBags"
              type="number"
              min={0}
              defaultValue={product?.cartonToBags ?? ""}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bagsToUnits">שקית → יחידות</FieldLabel>
            <Input
              id="bagsToUnits"
              name="bagsToUnits"
              type="number"
              min={0}
              defaultValue={product?.bagsToUnits ?? ""}
            />
            <FieldDescription>תצוגת קרטון = מחיר יחידה אחרי הנחה × כמות באריזה.</FieldDescription>
          </Field>
        </div>

        {mixDocuments ? (
          <Field>
            <FieldLabel htmlFor="documentType">סוג מסמך למוצר זה</FieldLabel>
            <NativeSelect id="documentType" name="documentType" defaultValue={product?.documentType ?? ""}>
              <option value="">ברירת מחדל של הספק</option>
              {DOCUMENT_TYPES.filter((t) => t.value !== "MIX_PER_PRODUCT").map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="packagingNotes">הערות אריזה / המרה</FieldLabel>
          <Input id="packagingNotes" name="packagingNotes" defaultValue={product?.packagingNotes ?? ""} />
        </Field>
        <PlantsCouncilProductField
          supplierRelevant={supplierPlantsCouncilRelevant}
          productRelevant={product?.plantsCouncilRelevant}
        />
        <Field>
          <FieldLabel htmlFor="notes">הערות</FieldLabel>
          <Textarea id="notes" name="notes" defaultValue={product?.notes ?? ""} rows={3} />
        </Field>
      </FieldGroup>
      <Button type="submit">{product ? "שמירת מוצר" : "הוספת מוצר"}</Button>
    </form>
  );
}
