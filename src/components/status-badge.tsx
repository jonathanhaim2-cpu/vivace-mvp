import { Badge } from "@/components/ui/badge";
import { ORDER_STATUSES, PRICE_CHANGE, RECEIPT_STATUSES } from "@/lib/constants";
import { orderStatusLabel, receiptStatusLabel } from "@/lib/format";

export function OrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === ORDER_STATUSES.RECEIVED
      ? "default"
      : status === ORDER_STATUSES.PARTIAL
        ? "secondary"
        : status === ORDER_STATUSES.SENT
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{orderStatusLabel(status)}</Badge>;
}

export function ReceiptStatusBadge({ status }: { status: string }) {
  if (status === RECEIPT_STATUSES.PENDING_PRICE_APPROVAL) {
    return <Badge variant="secondary">ממתינה לאישור מחיר</Badge>;
  }
  if (status === RECEIPT_STATUSES.CREDIT_NEEDED) {
    return <Badge variant="destructive">נדרשת בקשת זיכוי</Badge>;
  }
  if (status === RECEIPT_STATUSES.APPROVED) {
    return <Badge>אושרה</Badge>;
  }
  return <Badge variant="outline">{receiptStatusLabel(status)}</Badge>;
}

export function PriceChangeBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === PRICE_CHANGE.PENDING) return <Badge variant="secondary">שינוי מחיר ממתין</Badge>;
  if (status === PRICE_CHANGE.APPROVED) return <Badge>מחיר עודכן</Badge>;
  if (status === PRICE_CHANGE.REJECTED) return <Badge variant="destructive">נדחה · זיכוי</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
