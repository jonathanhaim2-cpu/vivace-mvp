import Link from "next/link";
import { createRecurringLine, deleteRecurringLine } from "@/actions/recurring";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { computeDishCost, foodCostPercent, hierarchicalFoodCost } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function FoodCostPage() {
  const [dishes, products, recurring] = await Promise.all([
    prisma.dish.findMany({
      include: { components: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ include: { category: { include: { parent: true } } } }),
    prisma.recurringLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const costDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    kind: dish.kind,
    sellPrice: dish.sellPrice,
    standardCostPercent: dish.standardCostPercent,
    components: dish.components,
  }));
  const tree = hierarchicalFoodCost(costDishes, products);
  const income = recurring.filter((row) => row.kind === "INCOME").reduce((sum, row) => sum + row.amountIls, 0);
  const expense = recurring.filter((row) => row.kind === "EXPENSE").reduce((sum, row) => sum + row.amountIls, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Cost"
        description="עלות תיאורטית ממחירון הספקים. מנות ביניים בלי מחיר מכירה. רולאפ: סה״כ → מחלקה → תת־קטגוריה → מנה."
        action={{ href: "/foodcost/new", label: "מנה חדשה" }}
      />

      <Alert>
        <AlertTitle>TODO · ייבוא מכירות מ-Tabit</AlertTitle>
        <AlertDescription>
          אין חיבור לקופה. האחוז כאן הוא עלות מתכון מול מחיר מכירה שהוזן ידנית — לא מכירות בפועל.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>
            {tree.name} · {tree.percent != null ? `${tree.percent.toFixed(1)}%` : "אין %"}
          </CardTitle>
          <CardDescription>
            עלות {formatIls(tree.cost)} מול מכירה {formatIls(tree.sell)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {tree.children.length === 0 ? (
            <p className="text-muted-foreground">אין מנות למכירה עם רכיבים.</p>
          ) : (
            tree.children.map((dept) => (
              <details key={dept.id} className="rounded-lg border px-3 py-2">
                <summary className="cursor-pointer font-medium">
                  {dept.name} · {dept.percent != null ? `${dept.percent.toFixed(1)}%` : "—"}
                </summary>
                <div className="mt-2 space-y-2 ps-3">
                  {dept.children.map((sub) => (
                    <div key={sub.id}>
                      <p className="text-muted-foreground">
                        {sub.name} · {sub.percent != null ? `${sub.percent.toFixed(1)}%` : "—"}
                      </p>
                      <ul className="ps-3">
                        {sub.children.map((dish) => (
                          <li key={dish.id}>
                            <Link href={`/foodcost/${dish.id}`} className="hover:underline">
                              {dish.name} · עלות {formatIls(dish.cost)}
                              {dish.percent != null ? ` · ${dish.percent.toFixed(1)}%` : ""}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ))
          )}
        </CardContent>
      </Card>

      {dishes.length === 0 ? (
        <EmptyState title="אין מנות" description="הוסיפו מנה או מנת ביניים עם רכיבים." action={{ href: "/foodcost/new", label: "יצירת מנה" }} />
      ) : (
        <div className="space-y-3">
          {dishes.map((dish) => {
            const { cost } = computeDishCost(dish.id, costDishes, products);
            const percent = foodCostPercent(cost, dish.sellPrice);
            const over = percent != null && percent > dish.standardCostPercent;
            const prep = dish.kind === "INTERMEDIATE";
            return (
              <Link key={dish.id} href={`/foodcost/${dish.id}`}>
                <Card className={over ? "ring-1 ring-destructive/40" : "hover:bg-accent/30"}>
                  <CardHeader>
                    <CardTitle>{dish.name}</CardTitle>
                    <CardDescription>{prep ? "מנת ביניים / עיבוד · בלי מחיר מכירה" : "מנה למכירה"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4 text-sm">
                    <span>עלות {formatIls(cost)}</span>
                    {prep ? null : <span>מכירה {dish.sellPrice != null ? formatIls(dish.sellPrice) : "לא הוגדרה"}</span>}
                    {prep ? null : (
                      <span className={over ? "text-destructive" : ""}>
                        {percent != null ? `${percent.toFixed(1)}%` : "אין %"}
                        {` · תקן ${dish.standardCostPercent}%`}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>הכנסות והוצאות קבועות / משתנות</CardTitle>
          <CardDescription>
            הכנסות {formatIls(income)} · הוצאות {formatIls(expense)} · נטו {formatIls(income - expense)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין שורות עדיין.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recurring.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span>
                    {row.name} · {row.kind === "INCOME" ? "הכנסה" : "הוצאה"} · {row.cadence === "FIXED" ? "קבוע" : "משתנה"} ·{" "}
                    {formatIls(row.amountIls)}
                  </span>
                  <form action={deleteRecurringLine.bind(null, row.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      מחיקה
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createRecurringLine} className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">שם</FieldLabel>
              <Input id="name" name="name" required placeholder="שכירות חנות" />
            </Field>
            <Field>
              <FieldLabel htmlFor="amountIls">סכום חודשי (₪)</FieldLabel>
              <Input id="amountIls" name="amountIls" type="number" step="0.01" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="kind">סוג</FieldLabel>
              <select id="kind" name="kind" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="EXPENSE">הוצאה</option>
                <option value="INCOME">הכנסה</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="cadence">קבוע / משתנה</FieldLabel>
              <select id="cadence" name="cadence" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="FIXED">קבוע</option>
                <option value="VARIABLE">משתנה</option>
              </select>
            </Field>
            <Button type="submit" className="sm:col-span-2">
              הוספה
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link href="/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
        דוחות חודשיים
      </Link>
    </div>
  );
}
