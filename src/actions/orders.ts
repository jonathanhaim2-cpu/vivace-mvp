"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ORDER_STATUSES, WHATSAPP_STATUS } from "@/lib/constants";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { nextDeliveryInfo, parseDeliveryDays, parseWeekdays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireBranchAccess, requirePermission } from "@/lib/access";
import { resolveOrderBranchId } from "@/lib/branch-assignment";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

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
  const session = await requirePermission("action.create_orders");
  const supplierId = String(formData.get("supplierId") ?? "");
  const branchId =
    resolveOrderBranchId({
      explicitBranchId: String(formData.get("branchId") ?? ""),
      sessionBranchId: session.branchId,
    }) ?? "";
  const notesForDriver = String(formData.get("notesForDriver") ?? "").trim() || null;
  const rawLines = String(formData.get("lines") ?? "[]");
  const sendAnyway = formData.get("sendAnyway") === "true";
  const mergeMode = String(formData.get("mergeMode") ?? "separate");

  if (!supplierId) throw new Error("יש לבחור ספק");
  if (!branchId) throw new Error("יש לבחור סניף");
  await requireBranchAccess(branchId, session);

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
    await writeAuditLog(session, {
      action: AUDIT_ACTIONS.ORDER_CREATE,
      entityType: "Order",
      entityId: openOrder.id,
      summary: `מיזוג שורות להזמנה קיימת · ${supplier.name}`,
      meta: { merge: true, supplierId, branchId, lineCount: lines.length },
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

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.ORDER_CREATE,
    entityType: "Order",
    entityId: order.id,
    summary: `הזמנה חדשה · ${supplier.name}`,
    meta: { supplierId, branchId, lineCount: lines.length },
  });

  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

export async function markOrderSent(orderId: string) {
  const session = await requirePermission("action.send_whatsapp");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("הזמנה לא נמצאה");
  await requireBranchAccess(order.branchId, session);
  const alreadyTracked =
    order.whatsappStatus === WHATSAPP_STATUS.DELIVERED || order.whatsappStatus === WHATSAPP_STATUS.READ;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: ORDER_STATUSES.SENT,
      whatsappStatus: alreadyTracked ? order.whatsappStatus : WHATSAPP_STATUS.SENT,
      whatsappSentAt: order.whatsappSentAt ?? new Date(),
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.ORDER_SEND,
    entityType: "Order",
    entityId: orderId,
    summary: "הזמנה סומנה כנשלחה לספק",
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function updateWhatsAppStatus(orderId: string, status: string) {
  const session = await requirePermission("action.send_whatsapp");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("הזמנה לא נמצאה");
  await requireBranchAccess(order.branchId, session);
  const allowed = new Set<string>([
    WHATSAPP_STATUS.PENDING,
    WHATSAPP_STATUS.SENT,
    WHATSAPP_STATUS.DELIVERED,
    WHATSAPP_STATUS.READ,
  ]);
  if (!allowed.has(status)) throw new Error("סטטוס וואטסאפ לא חוקי");

  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      whatsappStatus: status,
      ...(status === WHATSAPP_STATUS.SENT ? { whatsappSentAt: now, status: ORDER_STATUSES.SENT } : {}),
      ...(status === WHATSAPP_STATUS.DELIVERED ? { whatsappDeliveredAt: now } : {}),
      ...(status === WHATSAPP_STATUS.READ ? { whatsappReadAt: now, whatsappDeliveredAt: now } : {}),
    },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function duplicateOrder(orderId: string) {
  const session = await requirePermission("action.create_orders");
  const source = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true, supplier: true },
  });
  if (!source) throw new Error("הזמנה לא נמצאה");
  const branchId = resolveOrderBranchId({
    sourceOrderBranchId: source.branchId,
    sessionBranchId: session.branchId,
  });
  if (!branchId) throw new Error("יש לבחור סניף");
  await requireBranchAccess(branchId, session);
  const products = await prisma.product.findMany({
    where: { id: { in: source.lines.map((line) => line.productId) } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  const order = await prisma.order.create({
    data: {
      supplierId: source.supplierId,
      branchId,
      status: ORDER_STATUSES.CONFIRMED,
      notesForDriver: source.notesForDriver,
      lines: {
        create: source.lines.map((line) => {
          const product = byId.get(line.productId);
          return {
            productId: line.productId,
            qty: line.qty,
            unitPrice: product?.agreedPrice ?? line.unitPrice,
            discountPercent: product?.discountPercent ?? line.discountPercent,
          };
        }),
      },
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.ORDER_CREATE,
    entityType: "Order",
    entityId: order.id,
    summary: `שכפול הזמנה קודמת · ${source.supplier.name}`,
    meta: { sourceOrderId: source.id, branchId },
  });
  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

export async function reassignOrderBranch(orderId: string, formData: FormData) {
  const session = await requirePermission("action.create_orders");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("הזמנה לא נמצאה");
  const branchId = resolveOrderBranchId({
    explicitBranchId: String(formData.get("branchId") ?? ""),
    sourceOrderBranchId: order.branchId,
  });
  if (!branchId) throw new Error("יש לבחור סניף");
  await requireBranchAccess(branchId, session);
  await prisma.order.update({ where: { id: orderId }, data: { branchId } });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.ORDER_CREATE,
    entityType: "Order",
    entityId: orderId,
    summary: "שויך מחדש סניף להזמנה",
    meta: { branchId, previousBranchId: order.branchId },
  });
  revalidatePath("/orders");
  revalidatePath("/settings/branch-review");
}
