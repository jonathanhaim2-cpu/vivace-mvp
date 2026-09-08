"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncProductPriceLists } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

function optionalInt(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function optionalFloat(value: FormDataEntryValue | null, fallback = 0) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readProductInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const stockStandard = Number(formData.get("stockStandard") ?? 0);
  const agreedPrice = Number(formData.get("agreedPrice") ?? 0);
  const discountPercent = Number(formData.get("discountPercent") ?? 0);
  const documentType = String(formData.get("documentType") ?? "").trim();

  if (!name) throw new Error("יש למלא שם מוצר");
  if (!Number.isFinite(stockStandard) || stockStandard < 0) {
    throw new Error("מלאי תקן לא חוקי");
  }
  if (!Number.isFinite(agreedPrice) || agreedPrice < 0) {
    throw new Error("מחיר מוסכם לא חוקי");
  }

  return {
    name,
    sku: String(formData.get("sku") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    stockStandard,
    agreedPrice,
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
    vatIncluded: formData.get("vatIncluded") === "on" || formData.get("vatIncluded") === "true",
    cartonToBags: optionalInt(formData.get("cartonToBags")),
    bagsToUnits: optionalInt(formData.get("bagsToUnits")),
    packagingNotes: String(formData.get("packagingNotes") ?? "").trim() || null,
    documentType: documentType || null,
    networkRebatePercent: optionalFloat(formData.get("networkRebatePercent")),
    networkPlusPercent: optionalFloat(formData.get("networkPlusPercent")),
  };
}

export async function createProduct(supplierId: string, formData: FormData) {
  const data = readProductInput(formData);
  const product = await prisma.product.create({ data: { ...data, supplierId } });
  await syncProductPriceLists(product);
  revalidatePath(`/suppliers/${supplierId}`);
  redirect(`/suppliers/${supplierId}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("מוצר לא נמצא");
  const data = readProductInput(formData);
  const updated = await prisma.product.update({ where: { id }, data });
  await syncProductPriceLists(updated);
  revalidatePath(`/suppliers/${product.supplierId}`);
  redirect(`/suppliers/${product.supplierId}`);
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("מוצר לא נמצא");
  const used = await prisma.orderLine.count({ where: { productId: id } });
  if (used > 0) {
    throw new Error("לא ניתן למחוק מוצר שכבר הוזמן");
  }
  await prisma.product.delete({ where: { id } });
  revalidatePath(`/suppliers/${product.supplierId}`);
  redirect(`/suppliers/${product.supplierId}`);
}
