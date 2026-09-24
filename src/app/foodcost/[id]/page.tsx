import { notFound } from "next/navigation";
import { addDishComponent, removeDishComponent, updateDishPricing } from "@/actions/dishes";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { annualAveragePrice, dishCostFromPrices, lastPurchasePrice, priceGap, type PurchasePoint } from "@/lib/price-stats";
import { prisma } from "@/lib/prisma";

export default async function DishDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dish, dishes, products] = await Promise.all([
    prisma.dish.findUnique({
      where: { id },
      include: {
        components: { include: { product: true, componentDish: true } },
      },
    }),
    prisma.dish.findMany({ include: { components: true } }),
    prisma.product.findMany({ include: { supplier: true, category: { include: { parent: true } } }, orderBy: { name: "asc" } }),
  ]);
  if (!dish) notFound();

  const costDishes = dishes.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    sellPrice: item.sellPrice,
    standardCostPercent: item.standardCostPercent,
    components: item.components,
  }));
  const { cost, lines } = computeDishCost(dish.id, costDishes, products);
  const percent = foodCostPercent(cost, dish.sellPrice);
  const over = percent != null && percent > dish.standardCostPercent;
  const intermediates = dishes.filter((item) => item.id !== dish.id);
  const qtyByProduct = new Map<string, number>();
  function walk(id: string, mult: number, seen: Set<string>) {
    if (seen.has(id)) return;
    seen.add(id);
    const current = dishes.find((item) => item.id === id);
    if (!current) return;
    for (const component of current.components) {
      if (component.productId) qtyByProduct.set(component.productId, (qtyByProduct.get(component.productId) ?? 0) + component.qty * mult);
      if (component.componentDishId) walk(component.componentDishId, component.qty * mult, seen);
    }
  }
  walk(dish.id, 1, new Set());
  const productIds = [...qtyByProduct.keys()];
  const year = new Date().getFullYear();
  const history = productIds.length
    ? await prisma.goodsReceiptLine.findMany({
        where: { orderLine: { productId: { in: productIds } }, invoicePrice: { gt: 0 }, receivedQty: { gt: 0 } },
        include: { goodsReceipt: true, orderLine: true },
      })
    : [];
  const pointsByProduct = new Map<string, PurchasePoint[]>();
  for (const row of history) {
    const list = pointsByProduct.get(row.orderLine.productId) ?? [];
    list.push({ at: row.goodsReceipt.createdAt.toISOString().slice(0, 10), qty: row.receivedQty, unitPrice: row.invoicePrice });
    pointsByProduct.set(row.orderLine.productId, list);
  }
  const lastMap = new Map(productIds.map((id) => [id, lastPurchasePrice(pointsByProduct.get(id) ?? [])]));
  const avgMap = new Map(productIds.map((id) => [id, annualAveragePrice(pointsByProduct.get(id) ?? [], year)]));
  const components = [...qtyByProduct.entries()].map(([productId, qty]) => ({ productId, qty }));
  const lastCost = dishCostFromPrices(components, lastMap);
  const avgCost = dishCostFromPrices(components, avgMap);
  const gap = priceGap(lastCost.cost, avgCost.cost);

  return (
    <div className="space-y-6">
      <PageHeader
        title={dish.name}
        description={dish.kind === "INTERMEDIATE" ? "מנת ביניים" : "מנה למכירה"}
      />

      {over ? (
        <Alert variant="destructive">
          <AlertTitle>חריגה מתקן ה-Food Cost</AlertTitle>
          <AlertDescription>
            {percent?.toFixed(1)}% מול תקן {dish.standardCostPercent}%. בדקו מחירון או מחיר מכירה.
          </AlertDescription>
        </Alert>
      ) : null}

      <CompactPanel
        title={`עלות תיאורטית ${formatIls(cost)}`}
        description={
          dish.kind === "INTERMEDIATE"
            ? `מנת ביניים בלי מחיר מכירה — רק עלות רכיבים · תקן ${dish.standardCostPercent}%`
            : percent != null
              ? `${percent.toFixed(1)}% ממחיר המכירה · תקן ${dish.standardCostPercent}%`
              : `הזינו מחיר מכירה לחישוב אחוז · תקן ${dish.standardCostPercent}%`
        }
      >
        <CompactForm action={updateDishPricing.bind(null, dish.id)}>
          {dish.kind === "INTERMEDIATE" ? (
            <p className="flex h-8 items-center text-xs text-muted-foreground">מנת ביניים — אין שדה מחיר מכירה.</p>
          ) : (
            <CompactField label="מחיר מכירה" htmlFor="sellPrice">
              <Input
                id="sellPrice"
                name="sellPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={dish.sellPrice ?? ""}
              />
            </CompactField>
          )}
          <CompactField label="תקן %" htmlFor="standardCostPercent">
            <Input
              id="standardCostPercent"
              name="standardCostPercent"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={dish.standardCostPercent}
            />
          </CompactField>
          <Button type="submit">עדכון</Button>
        </CompactForm>
      </CompactPanel>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">לפי מחיר אחרון</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(lastCost.cost)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">לפי ממוצע {year}</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(avgCost.cost)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">פער</p>
          <p className={gap?.direction === "up" ? "text-xl font-semibold text-trend-down" : gap?.direction === "down" ? "text-xl font-semibold text-trend-up" : "text-xl font-semibold"}>
            {gap ? `${gap.direction === "up" ? "▲" : gap.direction === "down" ? "▼" : "–"} ${Math.abs(gap.percent).toFixed(1)}%` : "אין היסטוריה"}
          </p>
        </article>
      </div>

      <CompactPanel title="רכיבי מתכון" description="גלם ממחירון הספק, או מנת ביניים עם עץ משלה.">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין רכיבים עדיין.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>רכיב</TableHead>
                <TableHead>כמות</TableHead>
                <TableHead>עלות</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dish.components.map((component) => {
                const name = component.product?.name ?? component.componentDish?.name ?? "—";
                const line = lines.find((item) => item.name === name);
                return (
                  <TableRow key={component.id}>
                    <TableCell>
                      {name}
                      {component.componentDishId ? " (ביניים)" : ""}
                      {component.notes ? ` · ${component.notes}` : ""}
                    </TableCell>
                    <TableCell>{component.qty}</TableCell>
                    <TableCell>{line ? formatIls(line.lineCost) : "—"}</TableCell>
                    <TableCell className="text-end">
                      <form action={removeDishComponent.bind(null, component.id, dish.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          הסרה
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CompactPanel>

      <CompactPanel title="הוספת רכיב">
          <CompactForm action={addDishComponent.bind(null, dish.id)}>
            <CompactField label="מוצר גלם" htmlFor="productId" grow>
              <NativeSelect id="productId" name="productId">
                <option value="">—</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.supplier.name}
                  </option>
                ))}
              </NativeSelect>
            </CompactField>
            <CompactField label="או מנת ביניים" htmlFor="componentDishId" grow>
              <NativeSelect id="componentDishId" name="componentDishId">
                <option value="">—</option>
                {intermediates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </CompactField>
            <CompactField label="כמות" htmlFor="qty">
              <Input id="qty" name="qty" type="number" min={0} step="0.001" required defaultValue={1} />
            </CompactField>
            <CompactField label="הערת המרה" htmlFor="notes" grow>
              <Input id="notes" name="notes" placeholder="למשל: 500ג מתוך שק 25ק״ג" />
            </CompactField>
            <Button type="submit">הוספה</Button>
          </CompactForm>
      </CompactPanel>
    </div>
  );
}
