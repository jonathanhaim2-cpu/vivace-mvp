import { createInventoryCount } from "@/actions/inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function NewInventoryCountPage() {
  const session = await getAppSession();
  const products = await prisma.product.findMany({
    include: { supplier: true },
    orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }],
  });
  const dateValue = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <div>
      <PageHeader title="ספירת מלאי חדשה" description="הזינו כמות שנספרה. אפשר להשלים ולשמור שוב כל עוד הספירה פתוחה." />
      <form action={createInventoryCount} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="branchId">סניף</FieldLabel>
            <select
              id="branchId"
              name="branchId"
              defaultValue={session.branchId ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="countedOn">תאריך ספירה</FieldLabel>
            <Input id="countedOn" name="countedOn" type="date" defaultValue={dateValue} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="notes">הערות</FieldLabel>
            <Textarea id="notes" name="notes" placeholder="למשל: ספירת בוקר לפני פתיחה" />
          </Field>
        </div>

        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="grid items-center gap-2 rounded-lg border bg-card px-3 py-2 sm:grid-cols-[1fr_8rem]"
            >
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.supplier.name}
                  {product.sku ? ` · ${product.sku}` : ""} · מלאי תקן {product.stockStandard}
                </p>
              </div>
              <Input
                name={`qty:${product.id}`}
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
                aria-label={`כמות ${product.name}`}
              />
            </div>
          ))}
        </div>
        <Button type="submit">שמירת ספירה</Button>
      </form>
    </div>
  );
}
