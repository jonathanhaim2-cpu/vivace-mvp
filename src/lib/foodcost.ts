export type CostProduct = {
  id: string;
  name: string;
  agreedPrice: number;
  discountPercent: number;
};

export type CostDish = {
  id: string;
  name: string;
  kind: string;
  sellPrice: number | null;
  standardCostPercent: number;
  components: {
    qty: number;
    notes: string | null;
    productId: string | null;
    componentDishId: string | null;
  }[];
};

export type CostBreakdownLine = {
  name: string;
  kind: "product" | "dish";
  qty: number;
  unitCost: number;
  lineCost: number;
  notes: string | null;
};

export function productUnitCost(product: CostProduct) {
  return product.agreedPrice * (1 - (product.discountPercent || 0) / 100);
}

export function computeDishCost(
  dishId: string,
  dishes: CostDish[],
  products: CostProduct[],
  seen: Set<string> = new Set(),
): { cost: number; lines: CostBreakdownLine[] } {
  if (seen.has(dishId)) {
    return { cost: 0, lines: [] };
  }
  seen.add(dishId);

  const dish = dishes.find((item) => item.id === dishId);
  if (!dish) return { cost: 0, lines: [] };

  const productById = new Map(products.map((p) => [p.id, p]));
  const lines: CostBreakdownLine[] = [];
  let cost = 0;

  for (const component of dish.components) {
    if (component.productId) {
      const product = productById.get(component.productId);
      if (!product) continue;
      const unitCost = productUnitCost(product);
      const lineCost = unitCost * component.qty;
      cost += lineCost;
      lines.push({
        name: product.name,
        kind: "product",
        qty: component.qty,
        unitCost,
        lineCost,
        notes: component.notes,
      });
      continue;
    }

    if (component.componentDishId) {
      const nested = computeDishCost(component.componentDishId, dishes, products, new Set(seen));
      const child = dishes.find((item) => item.id === component.componentDishId);
      const lineCost = nested.cost * component.qty;
      cost += lineCost;
      lines.push({
        name: child?.name ?? "מנה ביניים",
        kind: "dish",
        qty: component.qty,
        unitCost: nested.cost,
        lineCost,
        notes: component.notes,
      });
    }
  }

  return { cost, lines };
}

export function foodCostPercent(cost: number, sellPrice: number | null) {
  if (!sellPrice || sellPrice <= 0) return null;
  return (cost / sellPrice) * 100;
}
