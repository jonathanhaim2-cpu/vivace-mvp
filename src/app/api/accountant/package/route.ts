import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { accountantPackageText } from "@/lib/accountant-package";
import { getAccountRollup } from "@/lib/accounts";
import { monthRangeUtc, previousMonthKey } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month") || previousMonthKey();
  const rollup = await getAccountRollup(month);
  const { start, end } = monthRangeUtc(month);
  const photos = await prisma.invoicePhoto.findMany({
    where: {
      accountId: { not: null },
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
    },
    include: { account: { include: { parent: true } } },
    orderBy: { createdAt: "asc" },
  });

  const zip = new JSZip();
  const { subject, body } = accountantPackageText(month, rollup);
  zip.file("סיכום-הנהח.txt", `${subject}\n\n${body}\n`);

  for (const photo of photos) {
    const parent = photo.account?.parent?.name ?? "ללא-אב";
    const leaf = photo.account?.name ?? "ללא-כרטיס";
    const folder = `${sanitize(parent)}/${sanitize(leaf)}`;
    try {
      const bytes = await readFile(path.join(UPLOAD_DIR, photo.fileName));
      zip.file(`${folder}/${photo.originalName || photo.fileName}`, bytes);
    } catch {
      zip.file(`${folder}/${photo.fileName}.missing.txt`, "הקובץ לא נמצא בשרת המקומי");
    }
  }

  const buffer = await zip.generateAsync({ type: "uint8array" });
  const filename = `vivace-accountant-${month}.zip`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

function sanitize(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
