"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";

export async function uploadStandaloneInvoice(formData: FormData) {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("יש להעלות צילום חשבונית");
  }
  const category = String(formData.get("expenseCategory") ?? "OTHER");
  if (!EXPENSE_CATEGORIES.some((c) => c.value === category)) {
    throw new Error("קטגוריה לא חוקית");
  }
  const voiceNoteText = String(formData.get("voiceNoteText") ?? "").trim() || null;
  const saved = await saveUpload(photo);

  await prisma.invoicePhoto.create({
    data: {
      expenseCategory: category,
      voiceNoteText,
      fileName: saved.fileName,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
    },
  });

  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function updateInvoiceCategory(photoId: string, formData: FormData) {
  const category = String(formData.get("expenseCategory") ?? "");
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: { expenseCategory: category || null },
  });
  revalidatePath("/invoices");
}
