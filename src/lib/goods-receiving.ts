import { ORDER_STATUSES } from "@/lib/constants";

/** Open orders that still need intake: not received, and the supplier is ספק הזמנות. */
export function isAwaitingGoodsReceiving(input: {
  status: string;
  hasReceipt: boolean;
  supplierIsOrderable: boolean;
}): boolean {
  if (!input.supplierIsOrderable) return false;
  if (input.hasReceipt) return false;
  return input.status === ORDER_STATUSES.CONFIRMED || input.status === ORDER_STATUSES.SENT;
}
