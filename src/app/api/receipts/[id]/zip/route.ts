import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: { photos: true, order: { include: { supplier: true, branch: true } } },
  });

  if (!receipt || receipt.photos.length === 0) {
    return NextResponse.json({ error: "אין קבצים להורדה" }, { status: 404 });
  }

  const zip = new JSZip();
  for (const photo of receipt.photos) {
    try {
      const bytes = await readFile(path.join(UPLOAD_DIR, photo.fileName));
      zip.file(photo.originalName || photo.fileName, bytes);
    } catch {
      zip.file(`${photo.fileName}.missing.txt`, "הקובץ לא נמצא בשרת המקומי");
    }
  }

  const buffer = await zip.generateAsync({ type: "uint8array" });
  const filename = `vivace-receipt-${receipt.order.supplier.name}-${receipt.order.branch.name}.zip`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
