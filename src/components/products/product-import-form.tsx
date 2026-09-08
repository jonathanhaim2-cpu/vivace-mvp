import { importSupplierProducts } from "@/actions/import-products";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ProductImportForm({ supplierId }: { supplierId: string }) {
  return (
    <form action={importSupplierProducts.bind(null, supplierId)} className="space-y-3">
      <Field>
        <FieldLabel htmlFor="file">ייבוא מחירון Excel / CSV</FieldLabel>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
        <FieldDescription>
          עמודות בסגנון Zest: name / שם, sku / מק״ט, price / מחיר, discount / הנחה. אופציונלי: vat, carton, bags.
        </FieldDescription>
      </Field>
      <Button type="submit" variant="outline">
        ייבוא מוצרים
      </Button>
    </form>
  );
}
