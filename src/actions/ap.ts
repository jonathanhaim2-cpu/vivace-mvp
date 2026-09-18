"use server";

import { revalidatePath } from "next/cache";
import { PAYMENT_METHODS } from "@/lib/constants";
import { getSupplierApRows } from "@/lib/ap";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";
import { parsePaidFlag, restoreUnpaidAmount, snapshotOriginalAmount } from "@/lib/money";

function monthFrom(formData: FormData) {
  const raw = String(formData.get("month") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : monthKeyFromDate();
}

export async function requestKarteset(supplierId: string, formData: FormData) {
  await requirePermission("nav.ap");
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
  const session = await requirePermission("nav.ap");
  const month = monthFrom(formData);
  const payMethod = String(formData.get("payMethod") ?? "").trim();
  if (payMethod && !PAYMENT_METHODS.some((item) => item.value === payMethod)) {
    throw new Error("אמצעי תשלום לא חוקי");
  }
  const approvedRaw = String(formData.get("approved") ?? "on").trim().toLowerCase();
  const approved = approvedRaw !== "off" && approvedRaw !== "false" && approvedRaw !== "0";
  const rows = await getSupplierApRows(month);
  const row = rows.find((item) => item.supplier.id === supplierId);
  await prisma.supplierApMonth.upsert({
    where: { supplierId_month: { supplierId, month } },
    update: {
      approvedForPayment: approved,
      payMethod: payMethod || null,
      amountDue: row?.purchased ?? 0,
    },
    create: {
      supplierId,
      month,
      approvedForPayment: approved,
      payMethod: payMethod || null,
      amountDue: row?.purchased ?? 0,
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.AP_APPROVE_PAYMENT,
    entityType: "Supplier",
    entityId: supplierId,
    summary: approved ? `אושר תשלום לספק לחודש ${month}` : `בוטל אישור תשלום לספק לחודש ${month}`,
    meta: { month, payMethod: payMethod || null, approved },
  });
  revalidatePath("/ap");
  revalidatePath("/reports/ap");
}

export async function toggleExpenseFlags(photoId: string, formData: FormData) {
  await requirePermission("nav.ap");
  const paid = parsePaidFlag(formData.get("paid"));
  const sent = parsePaidFlag(formData.get("sentToAccountant"));
  const existing = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!existing) throw new Error("מסמך לא נמצא");
  const amountIls = paid
    ? existing.amountIls
    : restoreUnpaidAmount({
        amountIls: existing.amountIls,
        originalAmountIls: existing.originalAmountIls,
        aiTotalIls: existing.aiTotalIls,
      });
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      paid,
      paidAt: paid ? new Date() : null,
      sentToAccountant: sent,
      amountIls,
      originalAmountIls: snapshotOriginalAmount(existing.amountIls, existing.originalAmountIls),
    },
  });
  revalidatePath("/ap");
  revalidatePath("/invoices");
  revalidatePath("/");
}
