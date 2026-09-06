"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLeafAccount } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";

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
  const saved = await saveUpload(photo);

  await prisma.invoicePhoto.create({
    data: {
      accountId,
      amountIls: amountIls != null && Number.isFinite(amountIls) ? amountIls : null,
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
  const accountId = String(formData.get("accountId") ?? "");
  await assertLeafAccount(accountId);
  await prisma.invoicePhoto.update({
    where: { id: photoId },
    data: { accountId },
  });
  revalidatePath("/invoices");
}
