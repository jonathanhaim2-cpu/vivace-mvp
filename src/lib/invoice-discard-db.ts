import { unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { invoiceDiscardBlockedReason, KEEP_MAIL_IMPORT_ON_DISCARD } from "@/lib/invoice-discard";
import { UPLOAD_DIR } from "@/lib/uploads";

type Db = Pick<PrismaClient, "invoicePhoto" | "invoiceMailImport">;

/**
 * Delete the InvoicePhoto but keep InvoiceMailImport markers.
 * Next IMAP sync still treats the same attachment as already imported.
 */
export async function discardInvoicePhotoRecord(client: Db, photoId: string) {
  const photo = await client.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    throw new Error("חשבונית לא נמצאה");
  }
  const blocked = invoiceDiscardBlockedReason(photo);
  if (blocked) {
    throw new Error(blocked);
  }

  if (KEEP_MAIL_IMPORT_ON_DISCARD) {
    await client.invoiceMailImport.updateMany({
      where: { invoicePhotoId: photoId },
      data: { invoicePhotoId: null },
    });
  }
  await client.invoicePhoto.delete({ where: { id: photoId } });
  return photo;
}

export async function unlinkDiscardedInvoiceFile(fileName: string) {
  await unlink(path.join(UPLOAD_DIR, fileName)).catch(() => undefined);
}
