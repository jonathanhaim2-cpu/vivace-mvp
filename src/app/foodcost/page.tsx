import Link from "next/link";
import { createRecurringLine, deleteRecurringLine } from "@/actions/recurring";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReportExportButtons } from "@/components/report-export-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompactField, CompactForm, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeDishCost, foodCostPercent, hierarchicalFoodCost } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function FoodCostPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "" } = await searchParams;
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
  const listed = kind ? dishes.filter((dish) => dish.kind === kind) : dishes;
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
      <FilterBar>
        <CompactField label="סוג מנה" htmlFor="fc-kind">
          <NativeSelect id="fc-kind" name="kind" defaultValue={kind}>
            <option value="">הכל</option>
            <option value="DISH">מנה למכירה</option>
            <option value="INTERMEDIATE">מנת ביניים</option>
          </NativeSelect>
        </CompactField>
      </FilterBar>
      <ReportExportButtons report="foodcost" month={monthKeyFromDate()} />

      <Alert>
        <AlertTitle>TODO · ייבוא מכירות מ-Tabit</AlertTitle>
        <AlertDescription>
          אין חיבור לקופה. האחוז כאן הוא עלות מתכון מול מחיר מכירה שהוזן ידנית — לא מכירות בפועל.
        </AlertDescription>
      </Alert>

      <CompactPanel
        title={`${tree.name} · ${tree.percent != null ? `${tree.percent.toFixed(1)}%` : "אין %"}`}
        description={`עלות ${formatIls(tree.cost)} מול מכירה ${formatIls(tree.sell)}`}
      >
        <div className="space-y-2 text-sm">
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
        </div>
      </CompactPanel>

      {listed.length === 0 ? (
        <EmptyState title="אין מנות" description="הוסיפו מנה או מנת ביניים עם רכיבים." action={{ href: "/foodcost/new", label: "יצירת מנה" }} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מנה</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>עלות</TableHead>
              <TableHead>מכירה</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listed.map((dish) => {
              const { cost } = computeDishCost(dish.id, costDishes, products);
              const percent = foodCostPercent(cost, dish.sellPrice);
              const over = percent != null && percent > dish.standardCostPercent;
              const prep = dish.kind === "INTERMEDIATE";
              return (
                <TableRow key={dish.id} className={over ? "text-destructive" : undefined}>
                  <TableCell>
                    <Link href={`/foodcost/${dish.id}`} className="font-medium hover:underline">
                      {dish.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{prep ? "ביניים" : "למכירה"}</TableCell>
                  <TableCell>{formatIls(cost)}</TableCell>
                  <TableCell>{prep ? "—" : dish.sellPrice != null ? formatIls(dish.sellPrice) : "לא הוגדרה"}</TableCell>
                  <TableCell>
                    {prep ? "—" : `${percent != null ? `${percent.toFixed(1)}%` : "אין %"} · תקן ${dish.standardCostPercent}%`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <CompactPanel
        title="הכנסות והוצאות קבועות / משתנות"
        description={`הכנסות ${formatIls(income)} · הוצאות ${formatIls(expense)} · נטו ${formatIls(income - expense)} · ניהול מלא ב«הוצאות קבועות».`}
      >
        <div className="space-y-3">
          {recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין שורות עדיין.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>קצב</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurring.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.kind === "INCOME" ? "הכנסה" : "הוצאה"}</TableCell>
                    <TableCell>{row.cadence === "FIXED" ? "קבוע" : "משתנה"}</TableCell>
                    <TableCell>{formatIls(row.amountIls)}</TableCell>
                    <TableCell className="text-end">
                      <form action={deleteRecurringLine.bind(null, row.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          מחיקה
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <CompactForm action={createRecurringLine}>
            <CompactField label="שם" htmlFor="name" grow>
              <Input id="name" name="name" required placeholder="שכירות חנות" />
            </CompactField>
            <CompactField label="סכום חודשי (₪)" htmlFor="amountIls">
              <Input id="amountIls" name="amountIls" type="number" step="0.01" required />
            </CompactField>
            <CompactField label="סוג" htmlFor="kind">
              <NativeSelect id="kind" name="kind">
                <option value="EXPENSE">הוצאה</option>
                <option value="INCOME">הכנסה</option>
              </NativeSelect>
            </CompactField>
            <CompactField label="קבוע / משתנה" htmlFor="cadence">
              <NativeSelect id="cadence" name="cadence">
                <option value="FIXED">קבוע</option>
                <option value="VARIABLE">משתנה</option>
              </NativeSelect>
            </CompactField>
            <Button type="submit">הוספה</Button>
          </CompactForm>
        </div>
      </CompactPanel>

      <div className="flex flex-wrap gap-2">
        <Link href="/expenses" className={cn(buttonVariants({ variant: "outline" }))}>
          הוצאות קבועות
        </Link>
        <Link href="/reports/food-cost" className={cn(buttonVariants({ variant: "ghost" }))}>
          עלות רכש לפי ספק
        </Link>
        <Link href="/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
          דוחות חודשיים
        </Link>
      </div>
    </div>
  );
}
