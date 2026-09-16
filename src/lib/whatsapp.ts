import { COMPANY } from "@/lib/constants";
import { describePackaging, formatDate, formatIls, lineTotal } from "@/lib/format";
import { buildOrderHeaderLines, type OrderHeaderBranch } from "@/lib/order-header";

export function toWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return `972${digits}`;
}

export function buildWhatsAppUrl(phone: string, text: string) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${toWhatsAppPhone(phone)}?text=${encoded}`;
}

type OrderForMessage = {
  createdAt: Date;
  notesForDriver: string | null;
  branch: OrderHeaderBranch;
  supplier: { name: string };
  lines: {
    qty: number;
    unitPrice: number;
    discountPercent: number;
    product: {
      name: string;
      sku: string | null;
      cartonToBags: number | null;
      bagsToUnits: number | null;
    };
  }[];
};

export function buildOrderWhatsAppText(order: OrderForMessage) {
  const lines = order.lines.map((line) => {
    const pack = describePackaging(line.qty, line.product.cartonToBags, line.product.bagsToUnits);
    const sku = line.product.sku ? ` (${line.product.sku})` : "";
    const packNote = pack ? ` [${pack}]` : "";
    return `• ${line.product.name}${sku} — ${line.qty} יח׳${packNote}`;
  });

  const total = order.lines.reduce(
    (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
    0,
  );

  return [
    ...buildOrderHeaderLines(order.branch),
    "",
    `ספק: ${order.supplier.name}`,
    `תאריך: ${formatDate(order.createdAt)}`,
    "",
    "פריטים:",
    ...lines,
    "",
    order.notesForDriver ? `הערות למפיץ: ${order.notesForDriver}` : "הערות למפיץ: אין",
    `סה״כ משוער: ${formatIls(total)}`,
  ].join("\n");
}

export function buildCreditWhatsAppText(input: {
  branch: OrderHeaderBranch;
  supplierName: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  amountIls: number;
}) {
  return [
    ...buildOrderHeaderLines(input.branch),
    "",
    `בקשת זיכוי לספק ${input.supplierName}`,
    `פריט: ${input.productName}`,
    `הוזמן: ${input.orderedQty} · התקבל: ${input.receivedQty}`,
    `סכום לזיכוי: ${formatIls(input.amountIls)}`,
    "",
    `תודה, ${COMPANY.nameHe}`,
  ].join("\n");
}
