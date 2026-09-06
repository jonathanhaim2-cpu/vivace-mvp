import { COMPANY } from "@/lib/constants";
import { describePackaging, formatDate, formatIls, lineTotal } from "@/lib/format";

export function toWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return `972${digits}`;
}

export function buildWhatsAppUrl(phone: string, text: string) {
  return `https://wa.me/${toWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`;
}

type OrderForMessage = {
  createdAt: Date;
  notesForDriver: string | null;
  branch: { name: string };
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
    `הזמנה מ-${COMPANY.name} / ${COMPANY.nameHe}`,
    `סניף: ${order.branch.name}`,
    `ספק: ${order.supplier.name}`,
    `תאריך: ${formatDate(order.createdAt)}`,
    "",
    "פריטים:",
    ...lines,
    "",
    order.notesForDriver ? `הערות לנהג/מפיץ: ${order.notesForDriver}` : "הערות לנהג/מפיץ: אין",
    `סה״כ משוער: ${formatIls(total)}`,
    `עוסק מורשה ${COMPANY.taxId}`,
  ].join("\n");
}
