"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

function readMonth(formData: FormData) {
  const raw = String(formData.get("periodMonth") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : monthKeyFromDate();
}

function readOptionalMonth(formData: FormData) {
  const raw = String(formData.get("periodMonth") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
}

async function optionalLeaf(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return null;
  await assertLeafAccount(accountId);
  return accountId;
}

export async function uploadStandaloneInvoice(formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("יש להעלות צילום חשבונית");
  }
  const accountId = await optionalLeaf(formData);
  const voiceNoteText = String(formData.get("voiceNoteText") ?? "").trim() || null;
  const amountRaw = String(formData.get("amountIls") ?? "").trim();
  const amountIls = amountRaw ? Number(amountRaw) : null;
  const periodMonth = readMonth(formData);
  const saved = await saveUpload(photo);

  const created = await prisma.invoicePhoto.create({
    data: {
      accountId,
      amountIls: amountIls != null && Number.isFinite(amountIls) ? amountIls : null,
      voiceNoteText,
      fileName: saved.fileName,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      periodMonth,
      source: "MANUAL",
      classifiedAt: accountId ? new Date() : null,
    },
  });

  await analyzeStoredPhoto(created.id);

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_UPLOAD,
    entityType: "InvoicePhoto",
    entityId: created.id,
    summary: `הועלתה חשבונית · ${saved.originalName}`,
    meta: { fileName: saved.fileName, periodMonth },
  });

  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/settings");
  redirect("/invoices");
}

export async function updateInvoiceCategory(photoId: string, formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const accountId = String(formData.get("accountId") ?? "");
  await assertLeafAccount(accountId);
  const periodMonth = String(formData.get("periodMonth") ?? "").trim();
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId,
      classifiedAt: new Date(),
      ...(periodMonth ? { periodMonth } : {}),
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "חשבונית שובצה לקטגוריה",
    meta: { accountId, periodMonth: periodMonth || null },
  });
  revalidatePath("/invoices");
  revalidatePath("/reports");
}

export async function confirmAiSuggestion(photoId: string) {
  const session = await requirePermission("nav.invoices");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo?.aiAccountId) {
    throw new Error("אין הצעת AI לאישור");
  }
  await assertLeafAccount(photo.aiAccountId);
  const periodMonth = resolvedPeriodMonth(photo.periodMonth, photo.aiInvoiceDate);
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId: photo.aiAccountId,
      classifiedAt: new Date(),
      aiStatus: "CONFIRMED",
      amountIls: photo.amountIls ?? photo.aiTotalIls,
      ...(periodMonth ? { periodMonth } : {}),
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CONFIRM_AI,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "אושרה הצעת AI לסיווג חשבונית",
    meta: { accountId: photo.aiAccountId, periodMonth },
  });
  revalidatePath("/invoices");
  revalidatePath("/reports");
}

export async function analyzeInvoicePhoto(photoId: string) {
  await requirePermission("nav.invoices");
  await analyzeStoredPhoto(photoId);
  revalidatePath("/invoices");
  revalidatePath("/settings");
}

export async function importInboxFiles(formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    throw new Error("יש לבחור לפחות קובץ אחד לייבוא");
  }
  const periodMonth = readOptionalMonth(formData);
  const defaultAccount = await optionalLeaf(formData);

  const createdIds: string[] = [];
  for (const file of files) {
    const saved = await saveUpload(file);
    const created = await prisma.invoicePhoto.create({
      data: {
        accountId: defaultAccount,
        fileName: saved.fileName,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        periodMonth,
        source: "BULK_IMPORT",
        classifiedAt: defaultAccount ? new Date() : null,
      },
    });
    createdIds.push(created.id);
  }

  for (const id of createdIds) {
    await analyzeStoredPhoto(id);
  }

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_IMPORT,
    entityType: "InvoicePhoto",
    entityId: createdIds[0] ?? "bulk",
    summary: `יובאו ${createdIds.length} חשבוניות`,
    meta: { count: createdIds.length, ids: createdIds, periodMonth },
  });

  revalidatePath("/invoices");
  revalidatePath("/invoices/import");
  revalidatePath("/settings");
  redirect("/invoices");
}
