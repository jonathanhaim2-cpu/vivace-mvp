export type CostProduct = {
  id: string;
  name: string;
  agreedPrice: number;
  discountPercent: number;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    parentId: string | null;
    parent?: { id: string; name: string } | null;
  } | null;
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

function addQty(
  dishId: string,
  dishes: CostDish[],
  products: CostProduct[],
  multiplier: number,
  into: Map<string, number>,
  seen: Set<string>,
) {
  if (seen.has(dishId)) return;
  seen.add(dishId);
  const dish = dishes.find((item) => item.id === dishId);
  if (!dish) return;
  for (const component of dish.components) {
    if (component.productId) {
      into.set(component.productId, (into.get(component.productId) ?? 0) + component.qty * multiplier);
    } else if (component.componentDishId) {
      addQty(component.componentDishId, dishes, products, component.qty * multiplier, into, new Set(seen));
    }
  }
}

export type FoodCostNode = {
  id: string;
  name: string;
  cost: number;
  sell: number;
  percent: number | null;
  children: FoodCostNode[];
};

export function hierarchicalFoodCost(dishes: CostDish[], products: CostProduct[]): FoodCostNode {
  const saleDishes = dishes.filter((dish) => dish.kind !== "INTERMEDIATE");
  const productById = new Map(products.map((p) => [p.id, p]));
  const departments = new Map<string, FoodCostNode>();

  let overallCost = 0;
  let overallSell = 0;

  for (const dish of saleDishes) {
    const { cost } = computeDishCost(dish.id, dishes, products);
    const sell = dish.sellPrice ?? 0;
    overallCost += cost;
    overallSell += sell;

    const qtyByProduct = new Map<string, number>();
    addQty(dish.id, dishes, products, 1, qtyByProduct, new Set());
    const share = new Map<string, { parentId: string; parentName: string; childId: string; childName: string; cost: number }>();
    for (const [productId, qty] of qtyByProduct) {
      const product = productById.get(productId);
      if (!product) continue;
      const cat = product.category;
      const parentId = cat?.parent?.id ?? cat?.id ?? "uncat";
      const parentName = cat?.parent?.name ?? cat?.name ?? "ללא קטגוריה";
      const childId = cat?.id ?? "uncat";
      const childName = cat?.name ?? "ללא תת־קטגוריה";
      const lineCost = productUnitCost(product) * qty;
      const key = `${parentId}::${childId}`;
      const current = share.get(key);
      if (current) current.cost += lineCost;
      else share.set(key, { parentId, parentName, childId, childName, cost: lineCost });
    }
    const ranked = [...share.values()].sort((a, b) => b.cost - a.cost);
    const bucket = ranked[0] ?? {
      parentId: "uncat",
      parentName: "ללא קטגוריה",
      childId: "uncat",
      childName: "ללא תת־קטגוריה",
      cost,
    };

    let dept = departments.get(bucket.parentId);
    if (!dept) {
      dept = { id: bucket.parentId, name: bucket.parentName, cost: 0, sell: 0, percent: null, children: [] };
      departments.set(bucket.parentId, dept);
    }
    let sub = dept.children.find((child) => child.id === bucket.childId);
    if (!sub) {
      sub = { id: bucket.childId, name: bucket.childName, cost: 0, sell: 0, percent: null, children: [] };
      dept.children.push(sub);
    }
    dept.cost += cost;
    dept.sell += sell;
    sub.cost += cost;
    sub.sell += sell;
    sub.children.push({
      id: dish.id,
      name: dish.name,
      cost,
      sell,
      percent: foodCostPercent(cost, dish.sellPrice),
      children: [],
    });
  }

  const children = [...departments.values()].map((dept) => ({
    ...dept,
    percent: foodCostPercent(dept.cost, dept.sell),
    children: dept.children.map((sub) => ({ ...sub, percent: foodCostPercent(sub.cost, sub.sell) })),
  }));

  return {
    id: "overall",
    name: "סה״כ מזון",
    cost: overallCost,
    sell: overallSell,
    percent: foodCostPercent(overallCost, overallSell),
    children,
  };
}
