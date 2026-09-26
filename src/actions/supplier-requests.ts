"use server";

import { revalidatePath } from "next/cache";
import { PHOTO_DOCUMENT_TYPE } from "@/lib/constants";
import { closeRequestWithCreditNote, REQUEST_STATUS } from "@/lib/supplier-requests";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { saveUpload } from "@/lib/uploads";

/**
 * TODO(outbound-email): when RESEND_API_KEY or SMTP_HOST is configured, send the
 * preview body to the supplier accounting email from here — only after this
 * explicit confirm. There is no outbound mailer in the app today, so confirm
 * records the send and the UI opens a mailto: link. Never send without this action.
 */
export async function markSupplierRequestSent(requestId: string) {
  await requirePermission("action.goods_intake");
  const request = await prisma.supplierRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("הבקשה לא נמצאה");
  if (!request.sentAt) {
    await prisma.supplierRequest.update({
      where: { id: requestId },
      data: { sentAt: new Date() },
    });
  }
  revalidatePath("/credits");
  if (request.goodsReceiptId) revalidatePath(`/credits/preview/${request.goodsReceiptId}`);
}

export async function matchCreditNote(requestId: string, formData: FormData) {
  await requirePermission("action.goods_intake");
  const request = await prisma.supplierRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("הבקשה לא נמצאה");

  let photoId = String(formData.get("creditNotePhotoId") ?? "").trim();
  const upload = formData.get("photo");
  if (upload instanceof File && upload.size > 0) {
    const saved = await saveUpload(upload);
    const created = await prisma.invoicePhoto.create({
      data: {
        branchId: request.branchId,
        fileName: saved.fileName,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        contentHash: saved.contentHash,
        documentType: PHOTO_DOCUMENT_TYPE.CREDIT_NOTE,
        approvalStatus: "APPROVED",
        source: "MANUAL",
        aiSupplierName: undefined,
      },
    });
    photoId = created.id;
  }

  if (!photoId) throw new Error("יש לבחור או להעלות תעודת זיכוי");
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error("המסמך לא נמצא");
  const result = closeRequestWithCreditNote(request, photo);
  if (!result.closed) throw new Error(result.error ?? "לא ניתן לסגור את הבקשה");
  await prisma.supplierRequest.update({
    where: { id: requestId },
    data: {
      status: REQUEST_STATUS.CLOSED,
      creditNotePhotoId: photo.id,
      closedAt: new Date(),
    },
  });
  revalidatePath("/credits");
  revalidatePath("/");
  revalidatePath("/invoices");
}

export async function closeChargeRequest(requestId: string) {
  await requirePermission("action.goods_intake");
  const request = await prisma.supplierRequest.findUnique({ where: { id: requestId } });
  if (!request || request.kind !== "CHARGE") throw new Error("בקשת חיוב לא נמצאה");
  await prisma.supplierRequest.update({
    where: { id: requestId },
    data: { status: REQUEST_STATUS.CLOSED, closedAt: new Date() },
  });
  revalidatePath("/credits");
}
