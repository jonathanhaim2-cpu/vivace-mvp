import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { COMPANY, ROI_WHATSAPP_PHONE } from "../src/lib/constants";
import { ensurePriceLists, syncProductPriceLists } from "../src/lib/catalog";
import {
  displaySupplierName,
  REAL_SUPPLIER_DETAILS,
  type SupplierBranchOverlay,
  type SupplierOverlay,
} from "../src/lib/supplier-details";
import {
  SEMORY_CANONICAL_ID,
  SEMORY_DUPLICATE_IDS,
  isSemoryAliasName,
  mergeSemoryDuplicates,
} from "../src/lib/supplier-merge";

export { ROI_WHATSAPP_PHONE };

type CatalogBranch = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  contactName?: string;
};

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
  {
    id: "branch_beit_shemesh",
    name: "סניף בית שמש",
    address: "נחל קטלב 2, בית שמש",
    phone: ROI_WHATSAPP_PHONE,
    contactName: COMPANY.owner,
  },
  {
    id: "branch_kiryat_yearim",
    name: "סניף קרית יערים",
    address: "יצחק 27, קרית יערים",
    phone: ROI_WHATSAPP_PHONE,
    contactName: COMPANY.owner,
  },
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

function resolveSeedAddress(branch: CatalogBranch, existingAddress?: string | null) {
  const incoming = branch.address?.trim() || "";
  const current = existingAddress?.trim() || "";
  if (branch.id === "branch_kiryat_yearim") {
    if (current.includes("יצחק 27")) return current;
    if (incoming.includes("יצחק 27")) return incoming;
    if (!current || current === "קרית יערים") return "יצחק 27, קרית יערים";
    return current;
  }
  if (branch.id === "branch_beit_shemesh") {
    if (current.includes("נחל קטלב 2")) return current;
    if (incoming.includes("נחל קטלב 2")) return incoming;
    if (!current || current === "בית שמש") return "נחל קטלב 2, בית שמש";
    return current;
  }
  return incoming || current || null;
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
    const phone = branch.phone?.trim() || ROI_WHATSAPP_PHONE;
    const contactName = branch.contactName?.trim() || COMPANY.owner;
    const existing = await client.branch.findUnique({ where: { id: branch.id } });
    const address = resolveSeedAddress(branch, existing?.address);
    await client.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, address, phone, contactName },
      create: { id: branch.id, name: branch.name, address, phone, contactName },
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

function jsonDays(days: number[] | undefined) {
  if (!days) return undefined;
  return JSON.stringify(days);
}

function overlayBranchLinkData(overlay: SupplierBranchOverlay | undefined) {
  if (!overlay) return {};
  return {
    whatsappPhone: overlay.whatsappPhone ?? null,
    agentName: overlay.agentName ?? null,
    agentPhone: overlay.agentPhone ?? null,
    accountingPhone: overlay.accountingPhone ?? null,
    accountingEmail: overlay.accountingEmail ?? null,
    taxId: overlay.taxId ?? null,
    address: overlay.address ?? null,
    deliveryPointNumber: overlay.deliveryPointNumber ?? null,
    deliveryDays: jsonDays(overlay.deliveryDays) ?? null,
    orderDays: jsonDays(overlay.orderDays) ?? null,
    orderCutoffTime: overlay.orderCutoffTime ?? null,
    notes: overlay.notes ?? null,
  };
}

async function linkSupplierToBranches(
  client: PrismaClient,
  supplierId: string,
  branchIds: string[],
  overlay: SupplierOverlay | undefined,
) {
  await client.supplierBranch.deleteMany({
    where: { supplierId, branchId: { notIn: branchIds } },
  });
  for (const branchId of branchIds) {
    const extras = overlayBranchLinkData(overlay?.branchOverrides?.[branchId]);
    await client.supplierBranch.upsert({
      where: { supplierId_branchId: { supplierId, branchId } },
      update: extras,
      create: { supplierId, branchId, ...extras },
    });
  }
}

export async function seedRealCatalog(client: PrismaClient) {
  const file = path.join(process.cwd(), "prisma", "real-catalog.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as RealCatalog;
  const branches = resolveCatalogBranches(data);

  await ensureProductionBranches(client, branches);

  const mergedBefore = await mergeSemoryDuplicates(client);
  if (mergedBefore.mergedIds.length > 0) {
    console.log(`Merged Semory duplicates into ${SEMORY_CANONICAL_ID}: ${mergedBefore.mergedIds.join(", ")}`);
  }

  for (const supplier of data.suppliers) {
    if (
      supplier.id !== SEMORY_CANONICAL_ID &&
      (SEMORY_DUPLICATE_IDS.includes(supplier.id as (typeof SEMORY_DUPLICATE_IDS)[number]) ||
        isSemoryAliasName(supplier.name))
    ) {
      continue;
    }
    const overlay = REAL_SUPPLIER_DETAILS[supplier.id];
    const defaultCategoryId = await categoryIdByHint(client, supplier.catHint);
    const existingSupplier = await client.supplier.findUnique({ where: { id: supplier.id } });
    const name = displaySupplierName(supplier.id, supplier.name);
    const overlayPhone = overlay?.whatsappPhone?.trim() || supplier.whatsappPhone?.trim() || "";
    const existingPhone = existingSupplier?.whatsappPhone?.trim() || "";
    const supplierPhone = overlayPhone || existingPhone || ROI_WHATSAPP_PHONE;
    const documentType =
      overlay?.documentType ?? (supplier.slug === "produce" ? "DELIVERY_NOTE" : "TAX_INVOICE");
    const plantsCouncilRelevant = overlay?.plantsCouncilRelevant ?? supplier.slug === "produce";
    const plantsCouncilUrl = plantsCouncilRelevant
      ? (overlay?.plantsCouncilUrl ?? "https://www.plants.org.il/")
      : null;
    const plantsCouncilDiscountPct = plantsCouncilRelevant
      ? (overlay?.plantsCouncilDiscountPct ?? 10)
      : null;
    const deliveryDays = jsonDays(overlay?.deliveryDays) ?? existingSupplier?.deliveryDays ?? JSON.stringify([0, 1, 2, 3, 4]);
    const orderDays = jsonDays(overlay?.orderDays) ?? existingSupplier?.orderDays ?? "[]";
    const orderCutoffTime = overlay?.orderCutoffTime ?? existingSupplier?.orderCutoffTime ?? "14:00";

    const shared = {
      name,
      active: true,
      defaultCategoryId,
      documentType,
      taxId: overlay?.taxId ?? existingSupplier?.taxId ?? null,
      agentName: overlay?.agentName ?? existingSupplier?.agentName ?? null,
      agentPhone: overlay?.agentPhone ?? (overlayPhone || existingSupplier?.agentPhone || null),
      whatsappPhone: supplierPhone,
      accountingPhone: overlay?.accountingPhone ?? existingSupplier?.accountingPhone ?? null,
      accountingEmail: overlay?.accountingEmail ?? existingSupplier?.accountingEmail ?? null,
      address: overlay?.address ?? existingSupplier?.address ?? null,
      deliveryPointNumber: overlay?.deliveryPointNumber ?? existingSupplier?.deliveryPointNumber ?? null,
      deliveryDays,
      orderDays,
      orderCutoffTime,
      notes: overlay?.notes ?? existingSupplier?.notes ?? null,
      plantsCouncilUrl,
      plantsCouncilDiscountPct,
      plantsCouncilRelevant,
    };

    await client.supplier.upsert({
      where: { id: supplier.id },
      update: shared,
      create: {
        id: supplier.id,
        reminderHoursBefore: 2,
        ...shared,
      },
    });

    const branchIds = overlay?.branchIds?.length
      ? overlay.branchIds
      : branches.map((branch) => branch.id);
    await linkSupplierToBranches(client, supplier.id, branchIds, overlay);
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

  const mergedAfter = await mergeSemoryDuplicates(client);
  if (mergedAfter.mergedIds.length > 0) {
    console.log(`Merged leftover Semory duplicates into ${SEMORY_CANONICAL_ID}: ${mergedAfter.mergedIds.join(", ")}`);
  }

  console.log(
    `Production branches: ${branches.map((branch) => `${branch.name} (${branch.id})`).join(" · ")}`,
  );
}
