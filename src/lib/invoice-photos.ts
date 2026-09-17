import { duplicateInvoiceData, findExistingDuplicateOriginal } from "@/lib/invoice-duplicates";
import { prisma } from "@/lib/prisma";

export async function createUploadedInvoicePhoto(input: {
  saved: { fileName: string; originalName: string; mimeType: string; contentHash: string };
  accountId: string | null;
  branchId?: string | null;
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
      branchId: input.branchId ?? null,
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
