import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { MENU_ROOTS, ensureMenuTree } from "@/lib/menu-tree";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FoodCostPage() {
  await ensureMenuTree();
  const [dishes, products] = await Promise.all([
    prisma.dish.findMany({
      include: { components: true, children: { select: { id: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ include: { category: { include: { parent: true } } } }),
  ]);
  const costDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    kind: dish.kind,
    sellPrice: dish.sellPrice,
    standardCostPercent: dish.standardCostPercent,
    components: dish.components,
  }));
  const roots = MENU_ROOTS.map((root) => dishes.find((dish) => dish.systemKey === root.systemKey)).filter(
    (dish) => dish != null,
  );
  const loose = dishes.filter((dish) => dish.nodeKind !== "CATEGORY" && !dish.parentId && !dish.systemKey);

  return (
    <div className="space-y-6">
      <PageHeader
        title="פודקוסט"
        description="עצי מוצר. בכל מנה נשמרים מחיר אחרון וממוצע שנתי."
        action={{ href: "/foodcost/new", label: "מנה חדשה" }}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {roots.map((root) => (
          <Link
            key={root.id}
            href={`/foodcost/menu/${root.id}`}
            className="flex min-h-28 flex-col justify-between rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <span className="text-lg font-semibold">{root.name}</span>
            <span className="text-xs text-muted-foreground">{root.children.length} בתוך הקטגוריה</span>
          </Link>
        ))}
      </div>

      {loose.length === 0 ? (
        <EmptyState title="אין מנות מחוץ לעץ" description="מנות חדשות אפשר לשייך לקטגוריה מתוך האריח." />
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">מנות שעדיין לא שויכו לקטגוריה</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {loose.map((dish) => {
              const { cost } = computeDishCost(dish.id, costDishes, products);
              const percent = foodCostPercent(cost, dish.sellPrice);
              return (
                <li key={dish.id}>
                  <Link href={`/foodcost/${dish.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full justify-between")}>
                    <span>{dish.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatIls(cost)}
                      {percent != null ? ` · ${percent.toFixed(1)}%` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
