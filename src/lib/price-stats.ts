export type PurchasePoint = {
  at: string;
  qty: number;
  unitPrice: number;
};

export function lastPurchasePrice(points: PurchasePoint[]) {
  const usable = points.filter((point) => point.unitPrice > 0 && point.qty > 0);
  if (usable.length === 0) return null;
  const sorted = [...usable].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return sorted[0].unitPrice;
}

export function annualAveragePrice(points: PurchasePoint[], year: number) {
  const usable = points.filter((point) => {
    if (!(point.unitPrice > 0) || !(point.qty > 0)) return false;
    return point.at.startsWith(String(year));
  });
  const qty = usable.reduce((sum, point) => sum + point.qty, 0);
  if (qty <= 0) return null;
  const spend = usable.reduce((sum, point) => sum + point.qty * point.unitPrice, 0);
  return spend / qty;
}

export function priceGap(last: number | null, average: number | null) {
  if (last == null || average == null || average === 0) return null;
  const delta = last - average;
  const percent = (delta / average) * 100;
  const direction = Math.abs(percent) < 0.05 ? "flat" : delta > 0 ? "up" : "down";
  return { delta, percent, direction: direction as "up" | "down" | "flat" };
}

export function dishCostFromPrices(
  components: { qty: number; productId: string | null }[],
  priceByProduct: Map<string, number | null>,
) {
  let cost = 0;
  let missing = false;
  for (const component of components) {
    if (!component.productId) continue;
    const price = priceByProduct.get(component.productId);
    if (price == null) {
      missing = true;
      continue;
    }
    cost += price * component.qty;
  }
  return { cost, missing };
}
