"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { IMPORT_ANALYZE_GAP_MS, sleep } from "@/lib/ai-throttle";
import { INVOICE_DUPLICATE_STATUS } from "@/lib/constants";
import { invoiceClassificationFromForm } from "@/lib/invoice-form";
import {
  duplicateInvoiceData,
  findExistingDuplicateOriginal,
  markPhotoIfDuplicate,
} from "@/lib/invoice-duplicates";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { saveUpload, UPLOAD_DIR } from "@/lib/uploads";
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

function revalidateInvoicePaths() {
  revalidatePath("/invoices");
  revalidatePath("/invoices/import");
  revalidatePath("/invoices/package");
  revalidatePath("/reports");
  revalidatePath("/ap");
  revalidatePath("/anomalies");
  revalidatePath("/settings");
  revalidatePath("/");
}

async function createUploadedInvoicePhoto(input: {
  saved: { fileName: string; originalName: string; mimeType: string; contentHash: string };
  accountId: string | null;
  amountIls?: number | null;
  voiceNoteText?: string | null;
  periodMonth: string | null;
  source: string;
}) {
  const original = await findExistingDuplicateOriginal({
    contentHash: input.saved.contentHash,
    originalName: input.saved.originalName,
  });
  const duplicate = original?.id ? duplicateInvoiceData(original.id) : null;
  return prisma.invoicePhoto.create({
    data: {
      accountId: input.accountId,
      amountIls: input.amountIls ?? null,
      voiceNoteText: input.voiceNoteText ?? null,
      fileName: input.saved.fileName,
      originalName: input.saved.originalName,
      mimeType: input.saved.mimeType,
      contentHash: input.saved.contentHash,
      periodMonth: input.periodMonth,
      source: input.source,
      classifiedAt: input.accountId && !duplicate ? new Date() : null,
      ...(duplicate ?? { isDuplicate: false, duplicateOfId: null, duplicateStatus: null }),
    },
  });
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

  const created = await createUploadedInvoicePhoto({
    saved,
    accountId,
    amountIls: amountIls != null && Number.isFinite(amountIls) ? amountIls : null,
    voiceNoteText,
    periodMonth,
    source: "MANUAL",
  });
  if (!created.isDuplicate) {
    await analyzeStoredPhoto(created.id);
  }

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_UPLOAD,
    entityType: "InvoicePhoto",
    entityId: created.id,
    summary: created.isDuplicate
      ? `הועלתה חשבונית כפולה · ${saved.originalName}`
      : `הועלתה חשבונית · ${saved.originalName}`,
    meta: { fileName: saved.fileName, periodMonth, isDuplicate: created.isDuplicate },
  });

  revalidateInvoicePaths();
  redirect(created.isDuplicate ? "/invoices?dup=1" : "/invoices");
}

export async function updateInvoiceCategory(photoId: string, formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const accountId = String(formData.get("accountId") ?? "");
  await assertLeafAccount(accountId);
  const periodMonth = String(formData.get("periodMonth") ?? "").trim();
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (photo?.isDuplicate) {
    throw new Error("חשבונית מסומנת ככפיל — אשרו שהיא ייחודית לפני שיבוץ");
  }
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
  revalidateInvoicePaths();
}

export async function saveInvoiceClassification(photoId: string, formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const parsed = invoiceClassificationFromForm(formData);
  await assertLeafAccount(parsed.accountId);
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (photo?.isDuplicate) {
    throw new Error("חשבונית מסומנת ככפיל — אשרו שהיא ייחודית לפני שיבוץ");
  }
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId: parsed.accountId,
      classifiedAt: new Date(),
      periodMonth: parsed.periodMonth,
      aiInvoiceDate: parsed.invoiceDate,
      aiSupplierName: parsed.supplierName,
      amountIls: parsed.amountIls,
      voiceNoteText: parsed.note,
      aiStatus: "MANUAL",
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "חשבונית סווגה ידנית",
    meta: { accountId: parsed.accountId, periodMonth: parsed.periodMonth },
  });
  revalidateInvoicePaths();
}

export async function confirmAiSuggestion(photoId: string) {
  const session = await requirePermission("nav.invoices");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo?.aiAccountId) {
    throw new Error("אין הצעת AI לאישור");
  }
  if (photo.isDuplicate) {
    throw new Error("חשבונית מסומנת ככפיל — אשרו שהיא ייחודית לפני שיבוץ");
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
  revalidateInvoicePaths();
}

export async function analyzeInvoicePhoto(photoId: string) {
  await requirePermission("nav.invoices");
  await analyzeStoredPhoto(photoId);
  await markPhotoIfDuplicate(photoId);
  revalidateInvoicePaths();
}

export async function importInboxFiles(formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    throw new Error("יש לבחור לפחות קובץ אחד לייבוא");
  }
  const periodMonth = readOptionalMonth(formData);
  const defaultAccount = await optionalLeaf(formData);
  let duplicateCount = 0;

  const createdPhotos: { id: string; isDuplicate: boolean }[] = [];
  for (const file of files) {
    const saved = await saveUpload(file);
    const created = await createUploadedInvoicePhoto({
      saved,
      accountId: defaultAccount,
      periodMonth,
      source: "BULK_IMPORT",
    });
    if (created.isDuplicate) duplicateCount += 1;
    createdPhotos.push(created);
  }

  const toAnalyze = createdPhotos.filter((photo) => !photo.isDuplicate);
  for (const [index, photo] of toAnalyze.entries()) {
    if (index > 0) await sleep(IMPORT_ANALYZE_GAP_MS);
    await analyzeStoredPhoto(photo.id);
  }

  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_IMPORT,
    entityType: "InvoicePhoto",
    entityId: createdPhotos[0]?.id ?? "bulk",
    summary: `יובאו ${createdPhotos.length} חשבוניות${duplicateCount ? ` · ${duplicateCount} כפולות` : ""}`,
    meta: {
      count: createdPhotos.length,
      duplicateCount,
      ids: createdPhotos.map((photo) => photo.id),
      periodMonth,
    },
  });

  revalidateInvoicePaths();
  const params = new URLSearchParams();
  if (toAnalyze.length > 0) params.set("imported", String(toAnalyze.length));
  if (duplicateCount > 0) params.set("dup", String(duplicateCount));
  const qs = params.toString();
  redirect(qs ? `/invoices?${qs}` : "/invoices");
}

export async function confirmInvoiceUnique(photoId: string) {
  const session = await requirePermission("nav.invoices");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    throw new Error("חשבונית לא נמצאה");
  }
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      isDuplicate: false,
      duplicateOfId: null,
      duplicateStatus: INVOICE_DUPLICATE_STATUS.CONFIRMED_UNIQUE,
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: `חשבונית אושרה כייחודית · ${photo.originalName}`,
  });
  revalidateInvoicePaths();
}

export async function deleteDuplicateInvoice(photoId: string) {
  const session = await requirePermission("nav.invoices");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo?.isDuplicate) {
    throw new Error("אפשר למחוק רק חשבונית שמסומנת ככפיל");
  }
  await prisma.invoicePhoto.delete({ where: { id: photoId } });
  await unlink(path.join(UPLOAD_DIR, photo.fileName)).catch(() => undefined);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: `נמחקה חשבונית כפולה · ${photo.originalName}`,
  });
  revalidateInvoicePaths();
}
