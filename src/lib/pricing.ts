import { PRICE_LIST_KIND, VAT_RATE } from "@/lib/constants";

export type VisibleProductPrice = {
  listPrice: number;
  discountPercent: number;
  afterDiscount: number;
  beforeVat: number;
  packUnits: number;
  cartonPrice: number | null;
};

export function packUnits(cartonToBags?: number | null, bagsToUnits?: number | null) {
  const bags = cartonToBags && cartonToBags > 0 ? cartonToBags : 1;
  const units = bagsToUnits && bagsToUnits > 0 ? bagsToUnits : 1;
  return bags * units;
}

export function afterDiscount(price: number, discountPercent: number) {
  return price * (1 - (discountPercent || 0) / 100);
}

export function beforeVat(price: number, vatIncluded: boolean) {
  return vatIncluded ? price / (1 + VAT_RATE) : price;
}

export function visiblePrice(input: {
  agreedPrice: number;
  discountPercent: number;
  vatIncluded: boolean;
  cartonToBags?: number | null;
  bagsToUnits?: number | null;
  networkRebatePercent?: number;
  networkPlusPercent?: number;
  franchiseeItem?: { unitPrice: number; discountPercent: number } | null;
}): VisibleProductPrice {
  const listPrice = input.franchiseeItem?.unitPrice ?? input.agreedPrice;
  const discountPercent = input.franchiseeItem?.discountPercent ?? input.discountPercent;
  const discounted = afterDiscount(listPrice, discountPercent);
  const units = packUnits(input.cartonToBags, input.bagsToUnits);
  return {
    listPrice,
    discountPercent,
    afterDiscount: discounted,
    beforeVat: beforeVat(listPrice, input.vatIncluded),
    packUnits: units,
    cartonPrice: units > 1 ? discounted * units : null,
  };
}

export function networkNetPrice(input: {
  agreedPrice: number;
  discountPercent: number;
  networkRebatePercent?: number;
  networkPlusPercent?: number;
}) {
  const afterList = afterDiscount(input.agreedPrice, input.discountPercent);
  const afterRebate = afterDiscount(afterList, input.networkRebatePercent ?? 0);
  return afterRebate * (1 + (input.networkPlusPercent ?? 0) / 100);
}

export function priceListLabel(kind: string) {
  return kind === PRICE_LIST_KIND.NETWORK ? "מחירון רשת" : "מחירון זכיין";
}
