import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function FoodCostPage() {
  const [dishes, products] = await Promise.all([
    prisma.dish.findMany({
      include: { components: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany(),
  ]);

  const costDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    kind: dish.kind,
    sellPrice: dish.sellPrice,
    standardCostPercent: dish.standardCostPercent,
    components: dish.components,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food Cost"
        description="עלות תיאורטית ממחירון הספקים. מנות יכולות להכיל גלם או מנות ביניים (בצק, רוטב)."
        action={{ href: "/foodcost/new", label: "מנה חדשה" }}
      />

      <Alert>
        <AlertTitle>TODO · ייבוא מכירות מ-Tabit</AlertTitle>
        <AlertDescription>
          אין חיבור לקופה. האחוז כאן הוא עלות מתכון מול מחיר מכירה שהוזן ידנית — לא מכירות בפועל.
        </AlertDescription>
      </Alert>

      {dishes.length === 0 ? (
        <EmptyState title="אין מנות" description="הוסיפו מנה או מנת ביניים עם רכיבים." action={{ href: "/foodcost/new", label: "יצירת מנה" }} />
      ) : (
        <div className="space-y-3">
          {dishes.map((dish) => {
            const { cost } = computeDishCost(dish.id, costDishes, products);
            const percent = foodCostPercent(cost, dish.sellPrice);
            const over = percent != null && percent > dish.standardCostPercent;
            return (
              <Link key={dish.id} href={`/foodcost/${dish.id}`}>
                <Card className={over ? "ring-1 ring-destructive/40" : "hover:bg-accent/30"}>
                  <CardHeader>
                    <CardTitle>{dish.name}</CardTitle>
                    <CardDescription>{dish.kind === "INTERMEDIATE" ? "מנת ביניים / עיבוד" : "מנה למכירה"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4 text-sm">
                    <span>עלות {formatIls(cost)}</span>
                    <span>מכירה {dish.sellPrice != null ? formatIls(dish.sellPrice) : "לא הוגדרה"}</span>
                    <span className={over ? "text-destructive" : ""}>
                      {percent != null ? `${percent.toFixed(1)}%` : "אין %"}
                      {` · תקן ${dish.standardCostPercent}%`}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/reports" className={cn(buttonVariants({ variant: "ghost" }))}>
        דוחות חודשיים
      </Link>
    </div>
  );
}
