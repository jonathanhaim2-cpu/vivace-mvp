import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeInvoiceDocument, getAiRuntime } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

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
    const buffer = await readFile(path.join(UPLOAD_DIR, photo.fileName));
    const suggestion = await analyzeInvoiceDocument({
      buffer,
      mimeType: photo.mimeType,
      fileName: photo.originalName,
    });

    if (!suggestion) {
      await prisma.invoicePhoto.update({
        where: { id: photoId },
        data: { aiStatus: "FAILED" },
      });
      return null;
    }

    await prisma.invoicePhoto.update({
      where: { id: photoId },
      data: {
        aiSupplierName: suggestion.supplierName,
        aiInvoiceDate: suggestion.invoiceDate,
        aiTotalIls: suggestion.totalIls,
        aiAccountId: suggestion.accountId,
        aiConfidence: suggestion.confidence,
        aiReason: suggestion.reason,
        aiStatus: "SUGGESTED",
        amountIls: photo.amountIls ?? suggestion.totalIls,
      },
    });
    return suggestion;
  } catch (error) {
    console.error("analyzeStoredPhoto", error);
    await prisma.invoicePhoto.update({
      where: { id: photoId },
      data: { aiStatus: "FAILED" },
    });
    return null;
  }
}
