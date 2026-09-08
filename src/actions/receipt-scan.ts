"use server";

import { analyzeReceiptLines, getAiRuntime } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export type ReceiptScanMatch = {
  orderLineId: string;
  receivedQty: number;
  invoicePrice: number;
  matched: boolean;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").replace(/[״"'׳]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export async function scanReceiptDocument(orderId: string, formData: FormData) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: { include: { product: true } } },
  });
  if (!order) throw new Error("הזמנה לא נמצאה");

  const heuristic: ReceiptScanMatch[] = order.lines.map((line) => ({
    orderLineId: line.id,
    receivedQty: Math.round(line.qty),
    invoicePrice: line.unitPrice,
    matched: false,
  }));

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return {
      mode: "heuristic" as const,
      reason: "no_file",
      message: "בחרו קובץ מסמך לסריקה.",
      lines: heuristic,
    };
  }

  const runtime = await getAiRuntime();
  if (!runtime.available) {
    return {
      mode: "heuristic" as const,
      reason: runtime.reason,
      message:
        runtime.reason === "budget"
          ? "חריגה מתקציב AI — ממולאות כמויות ההזמנה. אפשר לערוך ידנית."
          : "חסר מפתח AI — ממולאות כמויות ההזמנה. העובד מאשר כמויות ידנית.",
      lines: heuristic,
    };
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const extracted = await analyzeReceiptLines({
    buffer,
    mimeType: photo.type || "image/jpeg",
    fileName: photo.name,
    catalog: order.lines.map((line) => ({ name: line.product.name, sku: line.product.sku })),
  });

  if (!extracted || extracted.length === 0) {
    return {
      mode: "heuristic" as const,
      reason: "failed",
      message: "הסריקה לא מצאה שורות. נשארו כמויות ההזמנה — אשרו ידנית.",
      lines: heuristic,
    };
  }

  const lines = order.lines.map((line) => {
    const sku = normalize(line.product.sku);
    const name = normalize(line.product.name);
    const hit =
      extracted.find((row) => sku && normalize(row.sku) === sku) ??
      extracted.find((row) => {
        const extractedName = normalize(row.name);
        return extractedName.length > 1 && (extractedName.includes(name) || name.includes(extractedName));
      });
    return {
      orderLineId: line.id,
      receivedQty: hit?.qty != null ? Math.round(hit.qty) : Math.round(line.qty),
      invoicePrice: hit?.unitPrice != null ? hit.unitPrice : line.unitPrice,
      matched: Boolean(hit),
    };
  });

  return {
    mode: "ai" as const,
    reason: "ok",
    message: `נמצאו ${lines.filter((l) => l.matched).length} שורות מהמסמך. אשרו כמויות.`,
    lines,
  };
}
