"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INVENTORY_KIND, STANDARD_STATUS } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/months";
import { generateOrderStandardSuggestions } from "@/lib/order-standards";
import { prisma } from "@/lib/prisma";
import { requireBranchAccess, requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

function readInventoryKind(raw: string, fallback: string) {
  if (raw === INVENTORY_KIND.START || raw === INVENTORY_KIND.END || raw === INVENTORY_KIND.SPOT) return raw;
  return fallback;
}

export async function createInventoryCount(formData: FormData) {
  const session = await requirePermission("action.edit_inventory");
  const branchId = String(formData.get("branchId") || session.branchId || "");
  if (!branchId) throw new Error("יש לבחור סניף");
  await requireBranchAccess(branchId, session);
  const countedOn = String(formData.get("countedOn") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const kind = readInventoryKind(String(formData.get("kind") ?? INVENTORY_KIND.SPOT), INVENTORY_KIND.SPOT);
  const countedDate = countedOn ? new Date(`${countedOn}T12:00:00`) : new Date();
  const periodMonth = String(formData.get("periodMonth") ?? "").trim() || monthKeyFromDate(countedDate);
  const products = await prisma.product.findMany({ select: { id: true } });

  const count = await prisma.inventoryCount.create({
    data: {
      branchId,
      countedOn: countedDate,
      status: "OPEN",
      kind,
      periodMonth,
      notes,
      lines: {
        create: products.map((product) => ({
          productId: product.id,
          countedQty: Number(formData.get(`qty:${product.id}`) ?? 0) || 0,
        })),
      },
    },
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${count.id}`);
}

export async function saveInventoryCount(countId: string, formData: FormData) {
  const session = await requirePermission("action.edit_inventory");
  const count = await prisma.inventoryCount.findUnique({
    where: { id: countId },
    include: { lines: true },
  });
  if (!count) throw new Error("ספירה לא נמצאה");
  await requireBranchAccess(count.branchId, session);
  if (count.status !== "OPEN") throw new Error("ספירה שנסגרה לא ניתנת לעריכה");

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const countedOn = String(formData.get("countedOn") ?? "").trim();
  const kind = readInventoryKind(String(formData.get("kind") ?? count.kind), count.kind);
  const countedDate = countedOn ? new Date(`${countedOn}T12:00:00`) : count.countedOn;
  const periodMonth = String(formData.get("periodMonth") ?? "").trim() || count.periodMonth || monthKeyFromDate(countedDate);

  await prisma.$transaction([
    prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        notes,
        kind,
        periodMonth,
        countedOn: countedDate,
      },
    }),
    ...count.lines.map((line) =>
      prisma.inventoryCountLine.update({
        where: { id: line.id },
        data: { countedQty: Number(formData.get(`qty:${line.productId}`) ?? line.countedQty) || 0 },
      }),
    ),
  ]);

  revalidatePath(`/inventory/${countId}`);
  revalidatePath("/inventory");
}

export async function submitInventoryCount(countId: string) {
  const session = await requirePermission("action.edit_inventory");
  const count = await prisma.inventoryCount.findUnique({ where: { id: countId } });
  if (!count) throw new Error("ספירה לא נמצאה");
  await requireBranchAccess(count.branchId, session);
  await prisma.inventoryCount.update({
    where: { id: countId },
    data: { status: "SUBMITTED" },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVENTORY_SUBMIT,
    entityType: "InventoryCount",
    entityId: countId,
    summary: `הוגשה ספירת מלאי (${count.kind})`,
    meta: { kind: count.kind, branchId: count.branchId, periodMonth: count.periodMonth },
  });
  if (count.kind === INVENTORY_KIND.END) {
    await generateOrderStandardSuggestions(countId);
  }
  revalidatePath(`/inventory/${countId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/standards");
  if (count.kind === INVENTORY_KIND.END) {
    redirect("/inventory/standards");
  }
}

export async function decideOrderStandard(id: string, formData: FormData) {
  const session = await requirePermission("action.edit_inventory");
  const decision = String(formData.get("decision") ?? "");
  const suggestion = await prisma.orderStandardSuggestion.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!suggestion) throw new Error("הצעת תקן לא נמצאה");
  await requireBranchAccess(suggestion.branchId, session);
  if (suggestion.status !== STANDARD_STATUS.PENDING) throw new Error("ההצעה כבר טופלה");

  if (decision === "approve") {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: suggestion.productId },
        data: { stockStandard: suggestion.suggestedStandard },
      }),
      prisma.orderStandardSuggestion.update({
        where: { id },
        data: { status: STANDARD_STATUS.APPROVED },
      }),
    ]);
  } else {
    await prisma.orderStandardSuggestion.update({
      where: { id },
      data: { status: STANDARD_STATUS.REJECTED },
    });
  }
  revalidatePath("/inventory/standards");
  revalidatePath("/inventory");
}
