"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { monthKeyFromDate } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";

function readMonth(formData: FormData) {
  const raw = String(formData.get("periodMonth") ?? "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? raw : monthKeyFromDate();
}

export async function uploadStandaloneInvoice(formData: FormData) {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("יש להעלות צילום חשבונית");
  }
  const accountId = String(formData.get("accountId") ?? "");
  await assertLeafAccount(accountId);
  const voiceNoteText = String(formData.get("voiceNoteText") ?? "").trim() || null;
  const amountRaw = String(formData.get("amountIls") ?? "").trim();
  const amountIls = amountRaw ? Number(amountRaw) : null;
  const periodMonth = readMonth(formData);
  const saved = await saveUpload(photo);

  await prisma.invoicePhoto.create({
    data: {
      accountId,
      amountIls: amountIls != null && Number.isFinite(amountIls) ? amountIls : null,
      voiceNoteText,
      fileName: saved.fileName,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      periodMonth,
      source: "MANUAL",
      classifiedAt: new Date(),
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/reports");
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

export async function importInboxFiles(formData: FormData) {
  const files = formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    throw new Error("יש לבחור לפחות קובץ אחד לייבוא");
  }
  const periodMonth = readMonth(formData);
  const defaultAccount = String(formData.get("accountId") ?? "").trim();
  if (defaultAccount) {
    await assertLeafAccount(defaultAccount);
  }

  for (const file of files) {
    const saved = await saveUpload(file);
    await prisma.invoicePhoto.create({
      data: {
        accountId: defaultAccount || null,
        fileName: saved.fileName,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        periodMonth,
        source: "BULK_IMPORT",
        classifiedAt: defaultAccount ? new Date() : null,
      },
    });
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/import");
  redirect("/invoices");
}
