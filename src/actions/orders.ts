"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ORDER_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export async function createOrder(formData: FormData) {
  const session = await getAppSession();
  const supplierId = String(formData.get("supplierId") ?? "");
  const branchId = String(formData.get("branchId") || session.branchId || "");
  const notesForDriver = String(formData.get("notesForDriver") ?? "").trim() || null;
  const rawLines = String(formData.get("lines") ?? "[]");

  if (!supplierId) throw new Error("יש לבחור ספק");
  if (!branchId) throw new Error("יש לבחור סניף");

  let parsed: { productId: string; qty: number }[] = [];
  try {
    parsed = JSON.parse(rawLines) as { productId: string; qty: number }[];
  } catch {
    throw new Error("שורות ההזמנה אינן תקינות");
  }

  const lines = parsed.filter((line) => line.qty > 0);
  if (lines.length === 0) throw new Error("יש לבחור לפחות מוצר אחד");

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, supplierId },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const order = await prisma.order.create({
    data: {
      supplierId,
      branchId,
      status: ORDER_STATUSES.CONFIRMED,
      notesForDriver,
      lines: {
        create: lines.map((line) => {
          const product = byId.get(line.productId);
          if (!product) throw new Error("מוצר לא שייך לספק שנבחר");
          return {
            productId: product.id,
            qty: line.qty,
            unitPrice: product.agreedPrice,
            discountPercent: product.discountPercent,
          };
        }),
      },
    },
  });

  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

export async function markOrderSent(orderId: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUSES.SENT },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
