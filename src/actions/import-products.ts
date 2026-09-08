"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncProductPriceLists } from "@/lib/catalog";
import { parseProductSpreadsheet } from "@/lib/import-products";
import { prisma } from "@/lib/prisma";

export async function importSupplierProducts(supplierId: string, formData: FormData) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error("ספק לא נמצא");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("יש להעלות קובץ Excel או CSV");
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
    throw new Error("נתמכים רק קבצי .xlsx / .csv");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseProductSpreadsheet(buffer, file.name);
  if (rows.length === 0) {
    throw new Error("לא נמצאו שורות עם שם מוצר. עמודות: name/שם, sku/מק״ט, price/מחיר, discount/הנחה");
  }

  for (const row of rows) {
    const existing = row.sku
      ? await prisma.product.findFirst({ where: { supplierId, sku: row.sku } })
      : await prisma.product.findFirst({ where: { supplierId, name: row.name } });

    const data = {
      name: row.name,
      sku: row.sku,
      agreedPrice: row.agreedPrice,
      discountPercent: row.discountPercent,
      vatIncluded: row.vatIncluded,
      cartonToBags: row.cartonToBags,
      bagsToUnits: row.bagsToUnits,
      stockStandard: existing?.stockStandard ?? 1,
      categoryId: existing?.categoryId ?? supplier.defaultCategoryId,
      networkRebatePercent: existing?.networkRebatePercent ?? 0,
      networkPlusPercent: existing?.networkPlusPercent ?? 0,
    };

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { ...data, supplierId } });
    await syncProductPriceLists(product);
  }

  revalidatePath(`/suppliers/${supplierId}`);
  redirect(`/suppliers/${supplierId}?imported=${rows.length}`);
}
