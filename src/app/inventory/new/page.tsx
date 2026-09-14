import { createInventoryCount } from "@/actions/inventory";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_KIND } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/months";
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

  if (!session.branchId) {
    return (
      <div>
        <PageHeader
          title="ספירת מלאי חדשה"
          description="בחרו תחילת חודש / סוף חודש / נקודתית. סגירת ספירת סוף חודש מציעה תקני הזמנה לאישור."
        />
        <EmptyState
          title="אין סניף"
          description="ספירה שייכת לסניף. הוסיפו סניף בהגדרות ואז חזרו לכאן."
          action={{ href: "/settings", label: "הוספת סניף" }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="ספירת מלאי חדשה"
        description="בחרו תחילת חודש / סוף חודש / נקודתית. סגירת ספירת סוף חודש מציעה תקני הזמנה לאישור."
      />
      {products.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">אין מוצרים עדיין. אפשר לפתוח ספירה ריקה, או להוסיף ספק ומוצרים קודם.</p>
      ) : null}
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
          <Field>
            <FieldLabel htmlFor="kind">סוג ספירה</FieldLabel>
            <select
              id="kind"
              name="kind"
              defaultValue={INVENTORY_KIND.SPOT}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={INVENTORY_KIND.START}>תחילת חודש</option>
              <option value={INVENTORY_KIND.END}>סוף חודש</option>
              <option value={INVENTORY_KIND.SPOT}>ספירה נקודתית</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="periodMonth">חודש תקן</FieldLabel>
            <Input id="periodMonth" name="periodMonth" type="month" defaultValue={monthKeyFromDate()} dir="ltr" />
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
