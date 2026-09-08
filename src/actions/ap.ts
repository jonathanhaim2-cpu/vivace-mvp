"use server";

import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getSupplierApRows } from "@/lib/ap";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";

function monthFrom(formData: FormData) {
  const raw = String(formData.get("month") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : monthKeyFromDate();
}

export async function requestKarteset(supplierId: string, formData: FormData) {
  const month = monthFrom(formData);
  const rows = await getSupplierApRows(month);
  const row = rows.find((item) => item.supplier.id === supplierId);
  await prisma.supplierApMonth.upsert({
    where: { supplierId_month: { supplierId, month } },
    update: {
      kartesetRequestedAt: new Date(),
      kartesetStatus: "QUEUED",
      amountDue: row?.purchased ?? 0,
    },
    create: {
      supplierId,
      month,
      kartesetRequestedAt: new Date(),
      kartesetStatus: "QUEUED",
      amountDue: row?.purchased ?? 0,
    },
  });
  revalidatePath("/ap");
  revalidatePath("/");
}

export async function approveSupplierPayment(supplierId: string, formData: FormData) {
  const month = monthFrom(formData);
  const payMethod = String(formData.get("payMethod") ?? "").trim();
  if (payMethod && !PAYMENT_METHODS.some((item) => item.value === payMethod)) {
    throw new Error("אמצעי תשלום לא חוקי");
  }
  const rows = await getSupplierApRows(month);
  const row = rows.find((item) => item.supplier.id === supplierId);
  await prisma.supplierApMonth.upsert({
    where: { supplierId_month: { supplierId, month } },
    update: {
      approvedForPayment: true,
      payMethod: payMethod || null,
      amountDue: row?.purchased ?? 0,
    },
    create: {
      supplierId,
      month,
      approvedForPayment: true,
      payMethod: payMethod || null,
      amountDue: row?.purchased ?? 0,
    },
  });
  revalidatePath("/ap");
}

export async function toggleExpenseFlags(photoId: string, formData: FormData) {
  const paid = formData.get("paid") === "on" || formData.get("paid") === "true";
  const sent = formData.get("sentToAccountant") === "on" || formData.get("sentToAccountant") === "true";
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      paid,
      paidAt: paid ? new Date() : null,
      sentToAccountant: sent,
    },
  });
  revalidatePath("/ap");
  revalidatePath("/invoices");
  revalidatePath("/");
}
