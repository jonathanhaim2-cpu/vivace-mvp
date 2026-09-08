import { notFound } from "next/navigation";
import { addDishComponent, removeDishComponent, updateDishPricing } from "@/actions/dishes";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
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

      <Card>
        <CardHeader>
          <CardTitle>עלות תיאורטית {formatIls(cost)}</CardTitle>
          <CardDescription>
            {dish.kind === "INTERMEDIATE"
              ? "מנת ביניים בלי מחיר מכירה — רק עלות רכיבים"
              : percent != null
                ? `${percent.toFixed(1)}% ממחיר המכירה`
                : "הזינו מחיר מכירה לחישוב אחוז"}
            {` · תקן ${dish.standardCostPercent}%`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateDishPricing.bind(null, dish.id)} className="grid gap-3 sm:grid-cols-3 sm:items-end">
            {dish.kind === "INTERMEDIATE" ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">מנת ביניים — אין שדה מחיר מכירה.</p>
            ) : (
              <Field>
                <FieldLabel htmlFor="sellPrice">מחיר מכירה</FieldLabel>
                <Input
                  id="sellPrice"
                  name="sellPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={dish.sellPrice ?? ""}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="standardCostPercent">תקן %</FieldLabel>
              <Input
                id="standardCostPercent"
                name="standardCostPercent"
                type="number"
                min={0}
                max={100}
                step="0.1"
                defaultValue={dish.standardCostPercent}
              />
            </Field>
            <Button type="submit">עדכון</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>רכיבי מתכון</CardTitle>
          <CardDescription>גלם ממחירון הספק, או מנת ביניים עם עץ משלה.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין רכיבים עדיין.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {lines.map((line, index) => (
                <li key={`${line.name}-${index}`} className="flex justify-between gap-3">
                  <span>
                    {line.name} × {line.qty}
                    {line.kind === "dish" ? " (ביניים)" : ""}
                    {line.notes ? ` · ${line.notes}` : ""}
                  </span>
                  <span>{formatIls(line.lineCost)}</span>
                </li>
              ))}
            </ul>
          )}
          {dish.components.map((component) => (
            <form key={component.id} action={removeDishComponent.bind(null, component.id, dish.id)}>
              <Button type="submit" size="sm" variant="ghost">
                הסרת {component.product?.name ?? component.componentDish?.name}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הוספת רכיב</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addDishComponent.bind(null, dish.id)} className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="productId">מוצר גלם</FieldLabel>
              <select
                id="productId"
                name="productId"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="componentDishId">או מנת ביניים</FieldLabel>
              <select
                id="componentDishId"
                name="componentDishId"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {intermediates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="qty">כמות ביחידות רכש / מנה</FieldLabel>
              <Input id="qty" name="qty" type="number" min={0} step="0.001" required defaultValue={1} />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">הערת המרה</FieldLabel>
              <Input id="notes" name="notes" placeholder="למשל: 500ג מתוך שק 25ק״ג" />
            </Field>
            <Button type="submit">הוספה</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
