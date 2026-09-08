import { createProduct, updateProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { CategorySelect } from "@/components/categories/category-select";

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
};

export function ProductForm({
  supplierId,
  mixDocuments,
  product,
  categoryTree,
  defaultCategoryId,
}: {
  supplierId: string;
  mixDocuments: boolean;
  product?: ProductValues & { id: string };
  categoryTree: { id: string; name: string; children: { id: string; name: string }[] }[];
  defaultCategoryId?: string | null;
}) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct.bind(null, supplierId);

  return (
    <form action={action} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">שם מוצר</FieldLabel>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sku">מק״ט</FieldLabel>
            <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="categoryId">קטגוריה / תת־קטגוריה</FieldLabel>
            <CategorySelect
              id="categoryId"
              tree={categoryTree}
              defaultValue={product?.categoryId ?? defaultCategoryId ?? ""}
              emptyLabel="ללא — בחרו תת־קטגוריה"
            />
            <FieldDescription>השיבוץ הוא לתת־קטגוריה. האב נמדד בדוחות ובדשבורד.</FieldDescription>
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
            <FieldDescription>
              הכמות שצריך להחזיק בין שני משלוחים. ההזמנה תציע כמות לפי ימים עד המשלוח הבא.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="agreedPrice">מחיר מוסכם (₪)</FieldLabel>
            <Input
              id="agreedPrice"
              name="agreedPrice"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={product?.agreedPrice ?? ""}
            />
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
            <label className="flex h-8 items-center gap-2 text-sm">
              <input
                id="vatIncluded"
                type="checkbox"
                name="vatIncluded"
                defaultChecked={product?.vatIncluded ?? true}
              />
              המחיר כולל מע״מ
            </label>
          </Field>
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
          </Field>
        </div>

        {mixDocuments ? (
          <Field>
            <FieldLabel htmlFor="documentType">סוג מסמך למוצר זה</FieldLabel>
            <select
              id="documentType"
              name="documentType"
              defaultValue={product?.documentType ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">ברירת מחדל של הספק</option>
              {DOCUMENT_TYPES.filter((t) => t.value !== "MIX_PER_PRODUCT").map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="packagingNotes">הערות אריזה / המרה</FieldLabel>
          <Input id="packagingNotes" name="packagingNotes" defaultValue={product?.packagingNotes ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">הערות</FieldLabel>
          <Textarea id="notes" name="notes" defaultValue={product?.notes ?? ""} rows={3} />
        </Field>
      </FieldGroup>
      <Button type="submit">{product ? "שמירת מוצר" : "הוספת מוצר"}</Button>
    </form>
  );
}
