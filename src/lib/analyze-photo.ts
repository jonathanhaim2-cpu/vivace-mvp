import { analyzeInvoiceDocument, getAiRuntime } from "@/lib/ai";
import { aiFailureReason } from "@/lib/ai-throttle";
import { PHOTO_DOCUMENT_TYPE } from "@/lib/constants";
import { chooseIngestBranch } from "@/lib/branch-assignment";
import { markPhotoIfDuplicate } from "@/lib/invoice-duplicates";
import { resolvedPeriodMonth } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/uploads";

export async function analyzeStoredPhoto(photoId: string) {
  const photo = await prisma.invoicePhoto.findUnique({ where: { id: photoId } });
  if (!photo) return null;

  const runtime = await getAiRuntime();
  if (!runtime.available) {
    await prisma.invoicePhoto.update({
      where: { id: photoId },
      data: { aiStatus: runtime.reason === "budget" ? "BUDGET" : "SKIPPED_NO_KEY" },
    });
    return null;
  }

  try {
    const buffer = await readStoredFile(photo.fileName);
    if (!buffer) throw new Error("הקובץ לא נמצא");
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, address: true },
      orderBy: { name: "asc" },
    });
    const suggestion = await analyzeInvoiceDocument({
      buffer,
      mimeType: photo.mimeType,
      fileName: photo.originalName,
      branches,
    });

    if (!suggestion) {
      await prisma.invoicePhoto.update({
        where: { id: photoId },
        data: { aiStatus: "FAILED" },
      });
      return null;
    }

    const mappedBranch = chooseIngestBranch({
      documentText: [photo.originalName, photo.voiceNoteText, suggestion.reason, suggestion.branchHint]
        .filter(Boolean)
        .join("\n"),
      branches,
      aiHint: suggestion.branchHint,
    });
    const periodMonth = resolvedPeriodMonth(photo.periodMonth, suggestion.invoiceDate);
    const keepExistingType = photo.documentType !== PHOTO_DOCUMENT_TYPE.UNKNOWN;
    await prisma.invoicePhoto.update({
      where: { id: photoId },
      data: {
        aiSupplierName: suggestion.supplierName,
        aiInvoiceDate: suggestion.invoiceDate,
        aiTotalIls: suggestion.totalIls,
        aiAccountId: suggestion.accountId,
        aiDocumentType: suggestion.documentType,
        aiConfidence: suggestion.confidence,
        aiReason: suggestion.reason,
        aiStatus: "SUGGESTED",
        aiBranchId: mappedBranch.branchId,
        aiNetworkExpense: mappedBranch.network,
        amountIls: photo.amountIls ?? suggestion.totalIls,
        ...(keepExistingType || suggestion.documentType === PHOTO_DOCUMENT_TYPE.UNKNOWN
          ? {}
          : { documentType: suggestion.documentType }),
        ...(periodMonth ? { periodMonth } : {}),
      },
    });
    await markPhotoIfDuplicate(photoId);
    return suggestion;
  } catch (error) {
    console.error("analyzeStoredPhoto", error);
    await prisma.invoicePhoto.update({
      where: { id: photoId },
      data: { aiStatus: "FAILED", aiReason: aiFailureReason(error) },
    });
    return null;
  }
}
