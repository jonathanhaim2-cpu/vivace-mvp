"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { analyzeStoredPhoto } from "@/lib/analyze-photo";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";

function readMonth(formData: FormData) {
  const raw = String(formData.get("periodMonth") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : monthKeyFromDate();
}

async function optionalLeaf(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return null;
  await assertLeafAccount(accountId);
  return accountId;
}

export async function uploadStandaloneInvoice(formData: FormData) {
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

  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/settings");
  redirect("/invoices");
}

export async function updateInvoiceCategory(photoId: string, formData: FormData) {
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
  revalidatePath("/invoices");
  revalidatePath("/reports");
}

export async function confirmAiSuggestion(photoId: string) {
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo?.aiAccountId) {
    throw new Error("אין הצעת AI לאישור");
  }
  await assertLeafAccount(photo.aiAccountId);
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: {
      accountId: photo.aiAccountId,
      classifiedAt: new Date(),
      aiStatus: "CONFIRMED",
      amountIls: photo.amountIls ?? photo.aiTotalIls,
    },
  });
  revalidatePath("/invoices");
  revalidatePath("/reports");
}

export async function analyzeInvoicePhoto(photoId: string) {
  await analyzeStoredPhoto(photoId);
  revalidatePath("/invoices");
  revalidatePath("/settings");
}

export async function importInboxFiles(formData: FormData) {
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    throw new Error("יש לבחור לפחות קובץ אחד לייבוא");
  }
  const periodMonth = readMonth(formData);
  const defaultAccount = await optionalLeaf(formData);

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
    await analyzeStoredPhoto(created.id);
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/import");
  revalidatePath("/settings");
  redirect("/invoices");
}
