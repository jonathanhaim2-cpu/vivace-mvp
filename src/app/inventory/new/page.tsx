import { createInventoryCount } from "@/actions/inventory";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
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
      <CompactForm action={createInventoryCount}>
        <CompactField label="סניף" htmlFor="branchId">
          <NativeSelect id="branchId" name="branchId" defaultValue={session.branchId ?? ""}>
            {session.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="תאריך ספירה" htmlFor="countedOn">
          <Input id="countedOn" name="countedOn" type="date" defaultValue={dateValue} />
        </CompactField>
        <CompactField label="סוג ספירה" htmlFor="kind">
          <NativeSelect id="kind" name="kind" defaultValue={INVENTORY_KIND.SPOT}>
            <option value={INVENTORY_KIND.START}>תחילת חודש</option>
            <option value={INVENTORY_KIND.END}>סוף חודש</option>
            <option value={INVENTORY_KIND.SPOT}>ספירה נקודתית</option>
          </NativeSelect>
        </CompactField>
        <CompactField label="חודש תקן" htmlFor="periodMonth">
          <Input id="periodMonth" name="periodMonth" type="month" defaultValue={monthKeyFromDate()} dir="ltr" />
        </CompactField>
        <CompactField label="הערות" htmlFor="notes" grow>
          <Input id="notes" name="notes" placeholder="למשל: ספירת בוקר לפני פתיחה" />
        </CompactField>
        <Button type="submit">שמירת ספירה</Button>
        <div className="w-full basis-full space-y-1.5 pt-1">
          {products.map((product) => (
            <div
              key={product.id}
              className="grid items-center gap-2 rounded-lg border bg-card px-3 py-1.5 sm:grid-cols-[1fr_8rem]"
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
      </CompactForm>
    </div>
  );
}
