"use server";

import { revalidatePath } from "next/cache";
import { productUnitCost } from "@/lib/foodcost";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { requireBranchAccess, requirePermission } from "@/lib/access";

export async function createWasteEntry(formData: FormData) {
  const session = await requirePermission("action.edit_inventory");
  const branchId = String(formData.get("branchId") || session.branchId || "");
  if (!branchId) throw new Error("יש לבחור סניף");
  await requireBranchAccess(branchId, session);
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const qty = Number(formData.get("qty") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const occurredRaw = String(formData.get("occurredOn") ?? "").trim();
  const occurredOn = occurredRaw ? new Date(occurredRaw) : new Date();
  if (!Number.isFinite(qty) || qty < 0) throw new Error("כמות לא חוקית");

  let estimatedCost = 0;
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) estimatedCost = productUnitCost(product) * qty;
  }

  let voiceFileName: string | null = null;
  const voice = formData.get("voice");
  if (voice instanceof File && voice.size > 0) {
    const saved = await saveUpload(voice);
    voiceFileName = saved.fileName;
  }

  await prisma.wasteEntry.create({
    data: { branchId, productId, qty, estimatedCost, notes, occurredOn, voiceFileName },
  });
  revalidatePath("/waste");
  revalidatePath("/");
}

export async function deleteWasteEntry(id: string) {
  const session = await requirePermission("action.edit_inventory");
  const entry = await prisma.wasteEntry.findUnique({ where: { id } });
  if (!entry) return;
  await requireBranchAccess(entry.branchId, session);
  await prisma.wasteEntry.delete({ where: { id } });
  revalidatePath("/waste");
}
