"use server";

import { revalidatePath } from "next/cache";
import { PRICE_LIST_KIND } from "@/lib/constants";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { chargeUnitPrice, mutualApproval, transferAmount } from "@/lib/settlement";
import { requireBranchAccess, requirePermission } from "@/lib/access";

function revalidate() {
  revalidatePath("/settlements");
  revalidatePath("/reports");
}

export async function createTransfer(formData: FormData) {
  const session = await requirePermission("nav.home");
  const fromBranchId = String(formData.get("fromBranchId") ?? "");
  const toBranchId = String(formData.get("toBranchId") ?? "");
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const qty = Number(formData.get("qty") ?? 0);
  const side = String(formData.get("side") ?? "TO") === "FROM" ? "FROM" : "TO";
  if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) throw new Error("בחרו שני סניפים שונים");
  if (!title || !(qty > 0)) throw new Error("כמות ושם חובה");
  await requireBranchAccess(side === "FROM" ? fromBranchId : toBranchId, session);

  let unitPrice = Number(formData.get("unitPrice") ?? 0);
  if (productId) {
    const item = await prisma.priceListItem.findFirst({
      where: { productId, priceList: { kind: PRICE_LIST_KIND.FRANCHISEE } },
    });
    const network = await prisma.priceListItem.findFirst({
      where: { productId, priceList: { kind: PRICE_LIST_KIND.NETWORK } },
    });
    if (item) unitPrice = chargeUnitPrice(item.unitPrice, network?.unitPrice);
  }
  if (!(unitPrice >= 0)) throw new Error("מחיר לא תקין");

  const now = new Date();
  await prisma.interBranchTransfer.create({
    data: {
      fromBranchId,
      toBranchId,
      productId,
      title,
      qty,
      unitPrice,
      amountIls: transferAmount(qty, unitPrice),
      status: "PENDING",
      initiatorSide: side,
      fromApprovedAt: side === "FROM" ? now : null,
      toApprovedAt: side === "TO" ? now : null,
      periodMonth: monthKeyFromDate(),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidate();
}

export async function approveTransfer(id: string, formData: FormData) {
  const session = await requirePermission("nav.home");
  const row = await prisma.interBranchTransfer.findUnique({ where: { id } });
  if (!row || row.status === "REJECTED") throw new Error("תנועה לא נמצאה");
  const side = String(formData.get("side") ?? "");
  if (side !== "FROM" && side !== "TO") throw new Error("צד לא תקין");
  await requireBranchAccess(side === "FROM" ? row.fromBranchId : row.toBranchId, session);
  const fromApproved = side === "FROM" || row.fromApprovedAt != null;
  const toApproved = side === "TO" || row.toApprovedAt != null;
  const now = new Date();
  await prisma.interBranchTransfer.update({
    where: { id },
    data: {
      fromApprovedAt: fromApproved ? (row.fromApprovedAt ?? now) : null,
      toApprovedAt: toApproved ? (row.toApprovedAt ?? now) : null,
      status: mutualApproval({ fromApproved, toApproved }),
    },
  });
  revalidate();
}

export async function rejectTransfer(id: string) {
  const session = await requirePermission("nav.home");
  const row = await prisma.interBranchTransfer.findUnique({ where: { id } });
  if (!row) throw new Error("תנועה לא נמצאה");
  if (session.branchId && session.branchId !== row.fromBranchId && session.branchId !== row.toBranchId && !session.isNetwork) {
    throw new Error("אין גישה לתנועה");
  }
  await prisma.interBranchTransfer.update({ where: { id }, data: { status: "REJECTED" } });
  revalidate();
}

export async function saveRoyaltyPercent(formData: FormData) {
  await requirePermission("nav.reports");
  const value = Number(formData.get("royaltyPercent") ?? 0);
  if (!Number.isFinite(value) || value < 0) throw new Error("אחוז תמלוגים לא תקין");
  await prisma.appSetting.upsert({
    where: { key: "settlement.royaltyPercent" },
    update: { value: String(value) },
    create: { key: "settlement.royaltyPercent", value: String(value) },
  });
  revalidate();
}
