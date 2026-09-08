import { getSupplierApRows } from "@/lib/ap";
import { getCategoryFill, getForecastTurnover } from "@/lib/dashboard";
import { computeDishCost, foodCostPercent } from "@/lib/foodcost";
import { monthKeyFromDate, monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export async function buildChatContext(path: string) {
  const month = monthKeyFromDate();
  const forecast = await getForecastTurnover();
  const [suppliers, orders, fill, ap, dishes, products, waste] = await Promise.all([
    prisma.supplier.findMany({ select: { name: true, active: true }, orderBy: { name: "asc" } }),
    prisma.order.findMany({
      where: { status: { in: ["CONFIRMED", "SENT"] } },
      include: { supplier: true, branch: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    getCategoryFill(month, forecast),
    getSupplierApRows(month),
    prisma.dish.findMany({ include: { components: true } }),
    prisma.product.findMany(),
    prisma.wasteEntry.aggregate({ _sum: { estimatedCost: true } }),
  ]);

  const costDishes = dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    kind: dish.kind,
    sellPrice: dish.sellPrice,
    standardCostPercent: dish.standardCostPercent,
    components: dish.components,
  }));
  const sale = dishes.filter((d) => d.kind !== "INTERMEDIATE" && d.sellPrice);
  const fcLines = sale.map((dish) => {
    const { cost } = computeDishCost(dish.id, costDishes, products);
    return `${dish.name}: עלות ${cost.toFixed(1)} / מכירה ${dish.sellPrice} = ${foodCostPercent(cost, dish.sellPrice)?.toFixed(1) ?? "—"}%`;
  });

  return `עמוד נוכחי: ${path}
חודש: ${monthLabel(month)}. מחזור חזוי: ${forecast}₪.
ספקים: ${suppliers.map((s) => `${s.name}${s.active ? "" : " (לא פעיל)"}`).join(", ")}.
הזמנות פתוחות: ${orders.length === 0 ? "אין" : orders.map((o) => `${o.supplier.name} / ${o.branch.name} / ${o.status}`).join("; ")}.
רכש מול יעד: ${fill.map((row) => `${row.name} ${row.actualPercent?.toFixed(1) ?? 0}% / יעד ${row.targetPercent ?? "—"}%`).join("; ")}.
AP: ${ap.length === 0 ? "אין" : ap.map((row) => `${row.supplier.name} ${row.amountDue.toFixed(0)}₪${row.ap?.approvedForPayment ? " אושר" : ""}`).join("; ")}.
Food cost: ${fcLines.join("; ") || "אין מנות"}.
פחת מצטבר (כל הזמנים): ${waste._sum.estimatedCost ?? 0}₪.`;
}
