"use server";

import { revalidatePath } from "next/cache";
import { EXCEPTION_KIND, EXCEPTION_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

export async function resolveExceptionalItem(id: string, resolution: string) {
  const session = await requirePermission("action.approve_credits");
  const allowed = new Set<string>([
    EXCEPTION_STATUS.CONFIRMED,
    EXCEPTION_STATUS.ARRIVED,
    EXCEPTION_STATUS.CANCELLED,
  ]);
  if (!allowed.has(resolution)) throw new Error("סטטוס לא חוקי");

  const item = await prisma.exceptionalItem.findUnique({ where: { id } });
  if (!item) throw new Error("הפריט לא נמצא");

  await prisma.exceptionalItem.update({
    where: { id },
    data: { status: resolution, resolvedAt: new Date() },
  });

  if (resolution === EXCEPTION_STATUS.ARRIVED || resolution === EXCEPTION_STATUS.CANCELLED) {
    await prisma.exceptionalItem.updateMany({
      where: {
        id: { not: id },
        status: EXCEPTION_STATUS.OPEN,
        goodsReceiptLineId: item.goodsReceiptLineId,
        kind: EXCEPTION_KIND.CREDIT_REQUEST,
      },
      data: { status: EXCEPTION_STATUS.CANCELLED, resolvedAt: new Date() },
    });
  }

  if (item.goodsReceiptId) revalidatePath(`/receipts/${item.goodsReceiptId}`);
  if (item.orderId) revalidatePath(`/orders/${item.orderId}`);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.EXCEPTION_RESOLVE,
    entityType: "ExceptionalItem",
    entityId: id,
    summary: `טופל מסמך חריג · ${item.title}`,
    meta: { resolution, kind: item.kind },
  });
  revalidatePath("/");
  revalidatePath("/anomalies");
  revalidatePath("/receipts");
}
