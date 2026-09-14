import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { ROI_WHATSAPP_PHONE } from "../src/lib/constants";
import { ensurePriceLists, syncProductPriceLists } from "../src/lib/catalog";

export { ROI_WHATSAPP_PHONE };

type CatalogBranch = { id: string; name: string; address: string };

type RealCatalog = {
  whatsappPhone?: string;
  branches?: CatalogBranch[];
  /** Legacy single-branch catalog shape. */
  branch?: CatalogBranch;
  suppliers: Array<{
    id: string;
    name: string;
    slug: string;
    catHint: string;
    whatsappPhone?: string;
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

export const PRODUCTION_BRANCHES: CatalogBranch[] = [
  { id: "branch_beit_shemesh", name: "סניף בית שמש", address: "בית שמש" },
  { id: "branch_kiryat_yearim", name: "סניף קרית יערים", address: "קרית יערים" },
];

const LEGACY_PILOT_BRANCH_ID = "branch_pilot";

function normalizeBranchName(name: string) {
  return name.replace(/^סניף\s+/, "").trim();
}

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

async function reassignBranchRecords(client: PrismaClient, fromId: string, toId: string) {
  if (fromId === toId) return;

  await client.order.updateMany({ where: { branchId: fromId }, data: { branchId: toId } });
  await client.inventoryCount.updateMany({ where: { branchId: fromId }, data: { branchId: toId } });
  await client.wasteEntry.updateMany({ where: { branchId: fromId }, data: { branchId: toId } });

  const suggestions = await client.orderStandardSuggestion.findMany({ where: { branchId: fromId } });
  for (const row of suggestions) {
    const clash = await client.orderStandardSuggestion.findUnique({
      where: {
        branchId_productId_periodMonth: {
          branchId: toId,
          productId: row.productId,
          periodMonth: row.periodMonth,
        },
      },
    });
    if (clash) {
      await client.orderStandardSuggestion.delete({ where: { id: row.id } });
    } else {
      await client.orderStandardSuggestion.update({ where: { id: row.id }, data: { branchId: toId } });
    }
  }

  const links = await client.supplierBranch.findMany({ where: { branchId: fromId } });
  for (const link of links) {
    await client.supplierBranch.upsert({
      where: { supplierId_branchId: { supplierId: link.supplierId, branchId: toId } },
      update: {},
      create: { supplierId: link.supplierId, branchId: toId },
    });
  }
  await client.supplierBranch.deleteMany({ where: { branchId: fromId } });
  await client.branch.delete({ where: { id: fromId } });
}

function resolveCatalogBranches(data: RealCatalog): CatalogBranch[] {
  if (data.branches && data.branches.length > 0) return data.branches;
  if (data.branch) return [data.branch, ...PRODUCTION_BRANCHES.filter((b) => b.id !== data.branch?.id)];
  return PRODUCTION_BRANCHES;
}

function isPilotBranch(branch: { id: string; name: string }) {
  const lower = branch.name.toLowerCase();
  const normalized = normalizeBranchName(branch.name);
  return (
    branch.id === LEGACY_PILOT_BRANCH_ID ||
    normalized.includes("פיילוט") ||
    lower.includes("pilot")
  );
}

async function ensureProductionBranches(client: PrismaClient, branches: CatalogBranch[]) {
  const beitShemesh = branches.find((b) => b.id === "branch_beit_shemesh") ?? branches[0];
  const kiryatYearim =
    branches.find((b) => b.id === "branch_kiryat_yearim") ??
    branches.find((b) => b.id !== beitShemesh.id) ??
    PRODUCTION_BRANCHES[1];

  for (const branch of branches) {
    await client.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, address: branch.address },
      create: branch,
    });
  }

  const existing = await client.branch.findMany();
  for (const row of existing) {
    if (branches.some((branch) => branch.id === row.id)) continue;
    const normalized = normalizeBranchName(row.name);
    if (isPilotBranch(row) || normalized === "בית שמש" || row.name === beitShemesh.name) {
      await reassignBranchRecords(client, row.id, beitShemesh.id);
      continue;
    }
    if (normalized === "קרית יערים" || row.name === kiryatYearim.name) {
      await reassignBranchRecords(client, row.id, kiryatYearim.id);
    }
  }
}

async function linkSupplierToBranches(
  client: PrismaClient,
  supplierId: string,
  branches: CatalogBranch[],
) {
  for (const branch of branches) {
    await client.supplierBranch.upsert({
      where: { supplierId_branchId: { supplierId, branchId: branch.id } },
      update: {},
      create: { supplierId, branchId: branch.id },
    });
  }
}

/** Overwrites every supplier phone on each db:ready so production SQLite picks up Roi's number. */
export async function routeAllSupplierPhones(client: PrismaClient, phone = ROI_WHATSAPP_PHONE) {
  const result = await client.supplier.updateMany({
    data: {
      whatsappPhone: phone,
      agentPhone: phone,
      accountingPhone: phone,
    },
  });
  console.log(`Supplier phones routed to Roi ${phone} (${result.count} rows).`);
  return result.count;
}

export async function seedRealCatalog(client: PrismaClient) {
  const file = path.join(process.cwd(), "prisma", "real-catalog.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as RealCatalog;
  const phone = data.whatsappPhone?.trim() || ROI_WHATSAPP_PHONE;
  const branches = resolveCatalogBranches(data);

  await ensureProductionBranches(client, branches);

  for (const supplier of data.suppliers) {
    const defaultCategoryId = await categoryIdByHint(client, supplier.catHint);
    const supplierPhone = supplier.whatsappPhone?.trim() || phone;
    await client.supplier.upsert({
      where: { id: supplier.id },
      update: {
        name: supplier.name,
        active: true,
        whatsappPhone: supplierPhone,
        agentPhone: supplierPhone,
        accountingPhone: supplierPhone,
        defaultCategoryId,
        documentType: supplier.slug === "produce" ? "DELIVERY_NOTE" : "TAX_INVOICE",
        plantsCouncilUrl: supplier.slug === "produce" ? "https://www.plants.org.il/" : null,
        plantsCouncilDiscountPct: supplier.slug === "produce" ? 10 : null,
        plantsCouncilRelevant: supplier.slug === "produce",
      },
      create: {
        id: supplier.id,
        name: supplier.name,
        active: true,
        whatsappPhone: supplierPhone,
        agentPhone: supplierPhone,
        accountingPhone: supplierPhone,
        defaultCategoryId,
        documentType: supplier.slug === "produce" ? "DELIVERY_NOTE" : "TAX_INVOICE",
        deliveryDays: JSON.stringify([0, 1, 2, 3, 4]),
        orderCutoffTime: "14:00",
        reminderHoursBefore: 2,
        plantsCouncilUrl: supplier.slug === "produce" ? "https://www.plants.org.il/" : null,
        plantsCouncilDiscountPct: supplier.slug === "produce" ? 10 : null,
        plantsCouncilRelevant: supplier.slug === "produce",
      },
    });
    await linkSupplierToBranches(client, supplier.id, branches);
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

  console.log(
    `Production branches: ${branches.map((branch) => `${branch.name} (${branch.id})`).join(" · ")}`,
  );
}
