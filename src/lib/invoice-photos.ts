import { duplicateInvoiceData, findExistingDuplicateOriginal } from "@/lib/invoice-duplicates";
import { PHOTO_DOCUMENT_TYPE, parsePhotoDocumentType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function createUploadedInvoicePhoto(input: {
  saved: { fileName: string; originalName: string; mimeType: string; contentHash: string };
  accountId: string | null;
  branchId?: string | null;
  amountIls?: number | null;
  voiceNoteText?: string | null;
  periodMonth: string | null;
  source: string;
  documentType?: string | null;
  vatIncluded?: boolean;
  amountExVat?: number | null;
  vatAmount?: number | null;
}) {
  const original = await findExistingDuplicateOriginal({
    contentHash: input.saved.contentHash,
    originalName: input.saved.originalName,
  });
  const duplicate = original?.id ? duplicateInvoiceData(original.id) : null;
  return prisma.invoicePhoto.create({
    data: {
      accountId: input.accountId,
      branchId: input.branchId ?? null,
      amountIls: input.amountIls ?? null,
      originalAmountIls: input.amountIls ?? null,
      vatIncluded: input.vatIncluded ?? true,
      amountExVat: input.amountExVat ?? null,
      vatAmount: input.vatAmount ?? null,
      voiceNoteText: input.voiceNoteText ?? null,
      fileName: input.saved.fileName,
      originalName: input.saved.originalName,
      mimeType: input.saved.mimeType,
      contentHash: input.saved.contentHash,
      periodMonth: input.periodMonth,
      source: input.source,
      documentType: parsePhotoDocumentType(input.documentType ?? PHOTO_DOCUMENT_TYPE.UNKNOWN),
      classifiedAt: input.accountId && !duplicate ? new Date() : null,
      ...(duplicate ?? { isDuplicate: false, duplicateOfId: null, duplicateStatus: null }),
    },
  });
}
