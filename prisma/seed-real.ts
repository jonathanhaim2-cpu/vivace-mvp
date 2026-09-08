import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { ensurePriceLists, syncProductPriceLists } from "../src/lib/catalog";

type RealCatalog = {
  branch: { id: string; name: string; address: string };
  suppliers: Array<{
    id: string;
    name: string;
    slug: string;
    catHint: string;
    products: Array<{
      name: string;
      sku: string | null;
      agreedPrice: number;
      discountPercent: number;
      vatIncluded: boolean;
      packQty: number | null;
      packUnit: string | null;
      label: string | null;
    }>;
  }>;
};

async function categoryIdByHint(client: PrismaClient, hint: string) {
  const sub = await client.productCategory.findFirst({
    where: { name: { contains: hint }, parentId: { not: null } },
  });
  if (sub) return sub.id;
  const parent = await client.productCategory.findFirst({
    where: { name: { contains: hint.split(" ")[0] }, parentId: null },
  });
  return parent?.id ?? null;
}

export async function seedRealCatalog(client: PrismaClient) {
  const file = path.join(process.cwd(), "prisma", "real-catalog.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as RealCatalog;

  await client.branch.upsert({
    where: { id: data.branch.id },
    update: { name: data.branch.name, address: data.branch.address },
    create: data.branch,
  });

  for (const supplier of data.suppliers) {
    const defaultCategoryId = await categoryIdByHint(client, supplier.catHint);
    await client.supplier.upsert({
      where: { id: supplier.id },
      update: {
        name: supplier.name,
        active: true,
        defaultCategoryId,
        documentType: supplier.slug === "produce" ? "DELIVERY_NOTE" : "TAX_INVOICE",
        plantsCouncilUrl: supplier.slug === "produce" ? "https://www.plants.org.il/" : null,
        plantsCouncilDiscountPct: supplier.slug === "produce" ? 10 : null,
      },
      create: {
        id: supplier.id,
        name: supplier.name,
        active: true,
        whatsappPhone: "",
        defaultCategoryId,
        documentType: supplier.slug === "produce" ? "DELIVERY_NOTE" : "TAX_INVOICE",
        deliveryDays: JSON.stringify([0, 1, 2, 3, 4]),
        orderCutoffTime: "14:00",
        reminderHoursBefore: 2,
        plantsCouncilUrl: supplier.slug === "produce" ? "https://www.plants.org.il/" : null,
        plantsCouncilDiscountPct: supplier.slug === "produce" ? 10 : null,
      },
    });
    await client.supplierBranch.upsert({
      where: { supplierId_branchId: { supplierId: supplier.id, branchId: data.branch.id } },
      update: {},
      create: { supplierId: supplier.id, branchId: data.branch.id },
    });
    await ensurePriceLists(supplier.id);

    for (const product of supplier.products) {
      const existing = product.sku
        ? await client.product.findFirst({ where: { supplierId: supplier.id, sku: product.sku } })
        : await client.product.findFirst({ where: { supplierId: supplier.id, name: product.name } });
      const notes = [product.label, product.packUnit ? `יחידה: ${product.packUnit}` : null]
        .filter(Boolean)
        .join(" · ");
      const dataRow = {
        name: product.name,
        sku: product.sku,
        agreedPrice: product.agreedPrice,
        discountPercent: product.discountPercent,
        vatIncluded: product.vatIncluded,
        bagsToUnits: product.packQty,
        packagingNotes: notes || null,
        stockStandard: existing?.stockStandard ?? 1,
        categoryId: existing?.categoryId ?? defaultCategoryId,
        networkRebatePercent: existing?.networkRebatePercent ?? 0,
        networkPlusPercent: existing?.networkPlusPercent ?? 0,
      };
      const saved = existing
        ? await client.product.update({ where: { id: existing.id }, data: dataRow })
        : await client.product.create({ data: { ...dataRow, supplierId: supplier.id } });
      await syncProductPriceLists(saved);
    }
  }
}
