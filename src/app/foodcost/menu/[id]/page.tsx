import Link from "next/link";
import { notFound } from "next/navigation";
import { createDish } from "@/actions/dishes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { formatIls } from "@/lib/format";
import { ensureMenuTree } from "@/lib/menu-tree";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FoodCostMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureMenuTree();
  const node = await prisma.dish.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { components: true, children: { select: { id: true } } } },
    },
  });
  if (!node) notFound();
  const products = await prisma.product.findMany({ include: { category: { include: { parent: true } } } });
  const dishes = await prisma.dish.findMany({ include: { components: true } });
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
        title={node.name}
        description={node.parent ? node.parent.name : "קטגוריה בעץ המוצר. אפשר להוסיף תת־קטגוריה או מנה."}
        action={node.parent ? { href: `/foodcost/menu/${node.parent.id}`, label: "חזרה" } : { href: "/foodcost", label: "כל הקטגוריות" }}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {node.children.map((child) => {
          const isCategory = child.nodeKind === "CATEGORY";
          const { cost } = computeDishCost(child.id, costDishes, products);
          const percent = foodCostPercent(cost, child.sellPrice);
          return (
            <li key={child.id}>
              <Link
                href={isCategory ? `/foodcost/menu/${child.id}` : `/foodcost/${child.id}`}
                className="block rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <p className="font-medium">{child.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isCategory ? `${child.children.length} בפנים` : `${formatIls(cost)}${percent != null ? ` · ${percent.toFixed(1)}%` : ""}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        <CompactForm action={createDish}>
          <input type="hidden" name="parentId" value={node.id} />
          <input type="hidden" name="nodeKind" value="DISH" />
          <input type="hidden" name="kind" value="DISH" />
          <CompactField label="מנה חדשה" htmlFor="dish-name" grow>
            <Input id="dish-name" name="name" required placeholder="מרגריטה" />
          </CompactField>
          <CompactField label="מחיר מכירה" htmlFor="dish-price">
            <Input id="dish-price" name="sellPrice" type="number" min={0} step="0.01" />
          </CompactField>
          <Button type="submit">הוספת מנה</Button>
        </CompactForm>
        <CompactForm action={createDish}>
          <input type="hidden" name="parentId" value={node.id} />
          <input type="hidden" name="nodeKind" value="CATEGORY" />
          <CompactField label="תת־קטגוריה" htmlFor="cat-name" grow>
            <Input id="cat-name" name="name" required placeholder="למשל מידה או משפחה" />
          </CompactField>
          <Button type="submit" variant="outline">
            הוספת תת־קטגוריה
          </Button>
        </CompactForm>
      </div>
    </div>
  );
}
