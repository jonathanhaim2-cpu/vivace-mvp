"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ORDER_STATUSES } from "@/lib/constants";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { nextDeliveryInfo, parseDeliveryDays, parseWeekdays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

async function findOpenOrder(supplierId: string, branchId: string) {
  return prisma.order.findFirst({
    where: {
      supplierId,
      branchId,
      status: { in: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.SENT] },
      receipt: null,
    },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOrder(formData: FormData) {
  const session = await getAppSession();
  const supplierId = String(formData.get("supplierId") ?? "");
  const branchId = String(formData.get("branchId") || session.branchId || "");
  const notesForDriver = String(formData.get("notesForDriver") ?? "").trim() || null;
  const rawLines = String(formData.get("lines") ?? "[]");
  const sendAnyway = formData.get("sendAnyway") === "true";
  const mergeMode = String(formData.get("mergeMode") ?? "separate");

  if (!supplierId) throw new Error("יש לבחור ספק");
  if (!branchId) throw new Error("יש לבחור סניף");

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: { branchLinks: true },
  });
  if (!supplier) throw new Error("ספק לא נמצא");
  if (!session.isNetwork && !supplierVisibleToBranch(supplier, branchId)) {
    throw new Error("הספק אינו זמין לסניף זה");
  }

  const windowInfo = nextDeliveryInfo(
    parseDeliveryDays(supplier.deliveryDays),
    supplier.orderCutoffTime,
    parseWeekdays(supplier.orderDays),
  );
  if (!windowInfo.open && !sendAnyway) {
    throw new Error("חלון ההזמנה סגור. אשרו שליחה בכל זאת.");
  }

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

  const openOrder = await findOpenOrder(supplierId, branchId);
  if (mergeMode === "merge" && openOrder) {
    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const product = byId.get(line.productId);
        if (!product) throw new Error("מוצר לא שייך לספק שנבחר");
        const existing = openOrder.lines.find((row) => row.productId === product.id);
        if (existing) {
          await tx.orderLine.update({
            where: { id: existing.id },
            data: { qty: existing.qty + line.qty },
          });
        } else {
          await tx.orderLine.create({
            data: {
              orderId: openOrder.id,
              productId: product.id,
              qty: line.qty,
              unitPrice: product.agreedPrice,
              discountPercent: product.discountPercent,
            },
          });
        }
      }
      if (notesForDriver) {
        const combined = [openOrder.notesForDriver, notesForDriver].filter(Boolean).join(" · ");
        await tx.order.update({
          where: { id: openOrder.id },
          data: { notesForDriver: combined },
        });
      }
    });
    revalidatePath("/orders");
    revalidatePath(`/orders/${openOrder.id}`);
    redirect(`/orders/${openOrder.id}`);
  }

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
