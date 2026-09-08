"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOCUMENT_TYPES, PAYMENT_METHODS, PAYMENT_TERMS, WEEKDAYS } from "@/lib/constants";
import { ensurePriceLists } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

function readDays(formData: FormData) {
  const selected = formData
    .getAll("deliveryDay")
    .map((value) => Number(value))
    .filter((n) => WEEKDAYS.some((d) => d.value === n));
  return JSON.stringify(selected);
}

function readBranchIds(formData: FormData) {
  return formData
    .getAll("branchId")
    .map((value) => String(value))
    .filter(Boolean);
}

function optionalFloat(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function readSupplierInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const whatsappPhone = String(formData.get("whatsappPhone") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "TAX_INVOICE");
  const orderCutoffTime = String(formData.get("orderCutoffTime") ?? "14:00");
  const reminderHoursBefore = Number(formData.get("reminderHoursBefore") ?? 2);
  const weeklyBudgetRaw = String(formData.get("weeklyBudgetIls") ?? "").trim();
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();

  if (!name) throw new Error("יש למלא שם ספק");
  if (!whatsappPhone) throw new Error("יש למלא טלפון וואטסאפ לקבלת הזמנות");
  if (!DOCUMENT_TYPES.some((t) => t.value === documentType)) {
    throw new Error("סוג מסמך לא חוקי");
  }
  if (paymentTerms && !PAYMENT_TERMS.some((t) => t.value === paymentTerms)) {
    throw new Error("תנאי תשלום לא חוקיים");
  }
  if (paymentMethod && !PAYMENT_METHODS.some((t) => t.value === paymentMethod)) {
    throw new Error("אמצעי תשלום לא חוקי");
  }

  return {
    name,
    taxId: String(formData.get("taxId") ?? "").trim() || null,
    agentName: String(formData.get("agentName") ?? "").trim() || null,
    agentPhone: String(formData.get("agentPhone") ?? "").trim() || null,
    whatsappPhone,
    driverName: String(formData.get("driverName") ?? "").trim() || null,
    documentType,
    deliveryDays: readDays(formData),
    orderCutoffTime,
    reminderHoursBefore: Number.isFinite(reminderHoursBefore) ? reminderHoursBefore : 2,
    weeklyBudgetIls: weeklyBudgetRaw ? Number(weeklyBudgetRaw) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    defaultCategoryId: String(formData.get("defaultCategoryId") ?? "").trim() || null,
    active: formData.getAll("active").some((value) => value === "on" || value === "true" || value === "1"),
    paymentTerms: paymentTerms || null,
    paymentMethod: paymentMethod || null,
    accountingPhone: String(formData.get("accountingPhone") ?? "").trim() || null,
    accountingEmail: String(formData.get("accountingEmail") ?? "").trim() || null,
    partnerName: String(formData.get("partnerName") ?? "").trim() || null,
    partnerPercent: optionalFloat(formData.get("partnerPercent")),
    plantsCouncilUrl: String(formData.get("plantsCouncilUrl") ?? "").trim() || null,
    plantsCouncilDiscountPct: optionalFloat(formData.get("plantsCouncilDiscountPct")),
  };
}

async function replaceBranches(supplierId: string, branchIds: string[]) {
  await prisma.supplierBranch.deleteMany({ where: { supplierId } });
  if (branchIds.length === 0) return;
  await prisma.supplierBranch.createMany({
    data: branchIds.map((branchId) => ({ supplierId, branchId })),
  });
}

export async function createSupplier(formData: FormData) {
  const data = readSupplierInput(formData);
  const supplier = await prisma.supplier.create({ data });
  await replaceBranches(supplier.id, readBranchIds(formData));
  await ensurePriceLists(supplier.id);
  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplier(id: string, formData: FormData) {
  const data = readSupplierInput(formData);
  await prisma.supplier.update({ where: { id }, data });
  await replaceBranches(id, readBranchIds(formData));
  await ensurePriceLists(id);
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  redirect(`/suppliers/${id}`);
}

export async function deleteSupplier(id: string) {
  const orders = await prisma.order.count({ where: { supplierId: id } });
  if (orders > 0) {
    throw new Error("לא ניתן למחוק ספק עם הזמנות קיימות");
  }
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
  redirect("/suppliers");
}
