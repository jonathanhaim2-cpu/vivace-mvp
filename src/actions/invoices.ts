"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { IMPORT_ANALYZE_GAP_MS, sleep } from "@/lib/ai-throttle";
import { INVOICE_DUPLICATE_STATUS, INVOICE_SOURCE, PHOTO_DOCUMENT_TYPE, parsePhotoDocumentType } from "@/lib/constants";
import { invoiceClassificationFromForm } from "@/lib/invoice-form";
import { resolveInvoiceBranchChoice } from "@/lib/invoice-branch";
import { invoicesDupRedirect } from "@/lib/invoice-filters";
import { markPhotoIfDuplicate } from "@/lib/invoice-duplicates";
import {
  discardInvoicePhotoRecord,
  unlinkDiscardedInvoiceFile,
} from "@/lib/invoice-discard-db";
import { invoiceDiscardAuditSummary } from "@/lib/invoice-discard";
import { createUploadedInvoicePhoto } from "@/lib/invoice-photos";
import { monthKeyFromDate, resolvedPeriodMonth } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";
import { requireBranchAccess, requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";
import type { AppSession } from "@/lib/session";

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

async function resolveInvoiceBranchId(
  formData: FormData,
  session: AppSession,
  existing?: string | null,
  required = false,
) {
  const choice = resolveInvoiceBranchChoice({
    formValue: String(formData.get("branchId") ?? ""),
    existing,
  });
  if (choice.explicitNetwork) return null;
  if (!choice.branchId) {
    if (required) throw new Error("יש לבחור סניף או רשת");
    return null;
  }
  const branch = await prisma.branch.findUnique({ where: { id: choice.branchId }, select: { id: true } });
  if (!branch) throw new Error("סניף לא נמצא");
  await requireBranchAccess(branch.id, session);
  return branch.id;
}

function revalidateInvoicePaths() {
  revalidatePath("/invoices");
  revalidatePath("/invoices/import");
  revalidatePath("/invoices/mail");
  revalidatePath("/invoices/package");
  revalidatePath("/reports");
  revalidatePath("/ap");
  revalidatePath("/anomalies");
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function uploadStandaloneInvoice(formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("יש להעלות צילום חשבונית");
  }
  const accountId = await optionalLeaf(formData);
  const branchId = await resolveInvoiceBranchId(formData, session);
  const voiceNoteText = String(formData.get("voiceNoteText") ?? "").trim() || null;
  const amountRaw = String(formData.get("amountIls") ?? "").trim();
  const amountIls = amountRaw ? Number(amountRaw) : null;
  const periodMonth = readMonth(formData);
  const documentType = parsePhotoDocumentType(formData.get("documentType"));
  const saved = await saveUpload(photo);

  const created = await createUploadedInvoicePhoto({
    saved,
    accountId,
    branchId,
    amountIls: amountIls != null && Number.isFinite(amountIls) ? amountIls : null,
    voiceNoteText,
    periodMonth,
    source: INVOICE_SOURCE.MANUAL,
    documentType,
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
    meta: { fileName: saved.fileName, periodMonth, documentType, isDuplicate: created.isDuplicate },
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
  const branchId = await resolveInvoiceBranchId(formData, session, photo?.branchId);
  const documentType = formData.has("documentType")
    ? parsePhotoDocumentType(formData.get("documentType"))
    : null;
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId,
      classifiedAt: new Date(),
      branchId,
      ...(periodMonth ? { periodMonth } : {}),
      ...(documentType ? { documentType } : {}),
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "חשבונית שובצה לקטגוריה",
    meta: { accountId, periodMonth: periodMonth || null, documentType },
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
  const existingBranchId = photo?.aiNetworkExpense ? null : (photo?.aiBranchId ?? photo?.branchId);
  const branchId = await resolveInvoiceBranchId(formData, session, existingBranchId, true);
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId: parsed.accountId,
      branchId,
      classifiedAt: new Date(),
      periodMonth: parsed.periodMonth,
      aiInvoiceDate: parsed.invoiceDate,
      aiSupplierName: parsed.supplierName,
      amountIls: parsed.amountIls,
      voiceNoteText: parsed.note,
      documentType: parsed.documentType,
      aiStatus: "MANUAL",
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "חשבונית סווגה ידנית",
    meta: { accountId: parsed.accountId, periodMonth: parsed.periodMonth, documentType: parsed.documentType },
  });
  revalidateInvoicePaths();
}

export async function confirmAiSuggestion(photoId: string, formData?: FormData) {
  const session = await requirePermission("nav.invoices");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo?.aiAccountId) {
    throw new Error("אין הצעת AI לאישור");
  }
  if (photo.isDuplicate) {
    throw new Error("חשבונית מסומנת ככפיל — אשרו שהיא ייחודית לפני שיבוץ");
  }
  await assertLeafAccount(photo.aiAccountId);
  const suggestedBranchId = photo.aiNetworkExpense ? null : (photo.aiBranchId ?? photo.branchId);
  const branchId = formData
    ? await resolveInvoiceBranchId(formData, session, suggestedBranchId, true)
    : photo.aiNetworkExpense
      ? null
      : suggestedBranchId ?? session.branchId;
  if (formData == null && branchId) await requireBranchAccess(branchId, session);
  if (formData == null && !branchId && !photo.aiNetworkExpense) {
    throw new Error("יש לבחור סניף או רשת");
  }
  const periodMonth = resolvedPeriodMonth(photo.periodMonth, photo.aiInvoiceDate);
  const suggestedType = formData?.has("documentType")
    ? parsePhotoDocumentType(formData.get("documentType"))
    : parsePhotoDocumentType(photo.aiDocumentType);
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId: photo.aiAccountId,
      branchId,
      classifiedAt: new Date(),
      aiStatus: "CONFIRMED",
      amountIls: photo.amountIls ?? photo.aiTotalIls,
      ...(suggestedType !== PHOTO_DOCUMENT_TYPE.UNKNOWN || photo.documentType === PHOTO_DOCUMENT_TYPE.UNKNOWN
        ? { documentType: suggestedType }
        : {}),
      ...(periodMonth ? { periodMonth } : {}),
    },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CONFIRM_AI,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: "אושרה הצעת AI לסיווג חשבונית",
    meta: { accountId: photo.aiAccountId, periodMonth, documentType: suggestedType },
  });
  revalidateInvoicePaths();
}

export async function analyzeInvoicePhoto(photoId: string, formData?: FormData) {
  await requirePermission("nav.invoices");
  await analyzeStoredPhoto(photoId);
  const isDuplicate = await markPhotoIfDuplicate(photoId);
  revalidateInvoicePaths();
  if (isDuplicate) {
    redirect(invoicesDupRedirect(formData?.get("returnTo"), "ai"));
  }
}

export async function importInboxFiles(formData: FormData) {
  const session = await requirePermission("nav.invoices");
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    throw new Error("יש לבחור לפחות קובץ אחד לייבוא");
  }
  const periodMonth = readOptionalMonth(formData);
  const defaultAccount = await optionalLeaf(formData);
  const branchId = await resolveInvoiceBranchId(formData, session);
  let duplicateCount = 0;

  const createdPhotos: { id: string; isDuplicate: boolean; originalName: string }[] = [];
  for (const file of files) {
    const saved = await saveUpload(file);
    const created = await createUploadedInvoicePhoto({
      saved,
      accountId: defaultAccount,
      branchId,
      periodMonth,
      source: INVOICE_SOURCE.BULK_IMPORT,
    });
    if (created.isDuplicate) duplicateCount += 1;
    createdPhotos.push({
      id: created.id,
      isDuplicate: created.isDuplicate,
      originalName: created.originalName,
    });
  }

  const toAnalyze = createdPhotos.filter((photo) => !photo.isDuplicate);
  for (const [index, photo] of toAnalyze.entries()) {
    if (index > 0) await sleep(IMPORT_ANALYZE_GAP_MS);
    await analyzeStoredPhoto(photo.id);
  }

  for (const created of createdPhotos) {
    await writeAuditLog(session, {
      action: AUDIT_ACTIONS.INVOICE_IMPORT,
      entityType: "InvoicePhoto",
      entityId: created.id,
      summary: created.isDuplicate
        ? `יובאה חשבונית כפולה · ${created.originalName}`
        : `יובאה חשבונית · ${created.originalName}`,
      meta: {
        periodMonth,
        isDuplicate: created.isDuplicate,
        bulkCount: createdPhotos.length,
      },
    });
  }

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

async function finishInvoicePhotoDiscard(photoId: string, requireDuplicate: boolean) {
  const session = await requirePermission("nav.invoices");
  const existing = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!existing) {
    throw new Error("חשבונית לא נמצאה");
  }
  if (requireDuplicate && !existing.isDuplicate) {
    throw new Error("אפשר למחוק רק חשבונית שמסומנת ככפיל");
  }
  const photo = await discardInvoicePhotoRecord(prisma, photoId);
  await unlinkDiscardedInvoiceFile(photo.fileName);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_DISCARD,
    entityType: "InvoicePhoto",
    entityId: photoId,
    summary: invoiceDiscardAuditSummary(photo),
    meta: {
      originalName: photo.originalName,
      source: photo.source,
      isDuplicate: photo.isDuplicate,
      keepMailImport: true,
    },
  });
  revalidateInvoicePaths();
}

/** Discard a pending (or any non-final) invoice photo from the classify queue. */
export async function discardInvoicePhoto(photoId: string) {
  await finishInvoicePhotoDiscard(photoId, false);
  redirect("/invoices");
}

export async function deleteDuplicateInvoice(photoId: string) {
  await finishInvoicePhotoDiscard(photoId, true);
  redirect("/invoices");
}
