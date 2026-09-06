"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPES, WEEKDAYS } from "@/lib/constants";

function readDays(formData: FormData) {
  const selected = formData
    .getAll("deliveryDay")
    .map((value) => Number(value))
    .filter((n) => WEEKDAYS.some((d) => d.value === n));
  return JSON.stringify(selected);
}

function readSupplierInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const whatsappPhone = String(formData.get("whatsappPhone") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "TAX_INVOICE");
  const orderCutoffTime = String(formData.get("orderCutoffTime") ?? "14:00");
  const reminderHoursBefore = Number(formData.get("reminderHoursBefore") ?? 2);
  const weeklyBudgetRaw = String(formData.get("weeklyBudgetIls") ?? "").trim();

  if (!name) throw new Error("יש למלא שם ספק");
  if (!whatsappPhone) throw new Error("יש למלא טלפון וואטסאפ לקבלת הזמנות");
  if (!DOCUMENT_TYPES.some((t) => t.value === documentType)) {
    throw new Error("סוג מסמך לא חוקי");
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
  };
}

export async function createSupplier(formData: FormData) {
  const data = readSupplierInput(formData);
  const supplier = await prisma.supplier.create({ data });
  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplier(id: string, formData: FormData) {
  const data = readSupplierInput(formData);
  await prisma.supplier.update({ where: { id }, data });
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
