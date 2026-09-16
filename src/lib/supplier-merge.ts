import type { PrismaClient } from "@prisma/client";
import { PRICE_LIST_KIND, ROI_WHATSAPP_PHONE } from "@/lib/constants";

export const SEMORY_CANONICAL_ID = "sup_semory";
export const SEMORY_CANONICAL_NAME = "סמורי בע״מ";
export const SEMORY_TAX_ID = "515358430";
/** Legacy Zest export id later overlay-named סמורי (same ח.פ. / phone as Semory). */
export const SEMORY_DUPLICATE_IDS = ["sup_shiny"] as const;

export type SupplierMergeSpec = {
  canonicalId: string;
  canonicalName: string;
  duplicateIds: readonly string[];
  taxId?: string;
  isAliasName: (name: string) => boolean;
};

export const SEMORY_MERGE: SupplierMergeSpec = {
  canonicalId: SEMORY_CANONICAL_ID,
  canonicalName: SEMORY_CANONICAL_NAME,
  duplicateIds: SEMORY_DUPLICATE_IDS,
  taxId: SEMORY_TAX_ID,
  isAliasName: isSemoryAliasName,
};

/** Quotes, gershayim, punctuation — so סמורי בע"מ / בע״מ / Semory Ltd match. */
export function normalizeSupplierName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\u05F4\u05F3\u201C\u201D\u2018\u2019"']/g, "")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripLegalSuffix(name: string) {
  return name.replace(/\s+(בעמ|ltd|inc|llc|gmbh)\s*$/i, "").trim();
}

export function normalizeTaxId(taxId: string | null | undefined) {
  return (taxId ?? "").replace(/[\s-]/g, "");
}

export function isSemoryAliasName(name: string) {
  const n = stripLegalSuffix(normalizeSupplierName(name));
  return n === "סמורי" || n === "semory";
}

export function isSemoryDuplicateSupplier(supplier: { id: string; name: string; taxId?: string | null }) {
  if (supplier.id === SEMORY_CANONICAL_ID) return false;
  if (SEMORY_DUPLICATE_IDS.includes(supplier.id as (typeof SEMORY_DUPLICATE_IDS)[number])) return true;
  if (isSemoryAliasName(supplier.name)) return true;
  return Boolean(SEMORY_TAX_ID && normalizeTaxId(supplier.taxId) === SEMORY_TAX_ID);
}

async function ensureCanonicalSupplier(client: PrismaClient, spec: SupplierMergeSpec, donor: {
  whatsappPhone: string;
  documentType: string;
  deliveryDays: string;
  orderDays: string;
  orderCutoffTime: string;
  taxId?: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  const existing = await client.supplier.findUnique({ where: { id: spec.canonicalId } });
  if (existing) {
    await client.supplier.update({
      where: { id: spec.canonicalId },
      data: { name: spec.canonicalName, active: true, taxId: existing.taxId || spec.taxId || donor.taxId || null },
    });
    return existing;
  }

  await client.supplier.create({
    data: {
      id: spec.canonicalId,
      name: spec.canonicalName,
      active: true,
      whatsappPhone: donor.whatsappPhone?.trim() || ROI_WHATSAPP_PHONE,
      documentType: donor.documentType || "TAX_INVOICE",
      deliveryDays: donor.deliveryDays || "[]",
      orderDays: donor.orderDays || "[]",
      orderCutoffTime: donor.orderCutoffTime || "14:00",
      taxId: spec.taxId || donor.taxId || null,
      agentName: donor.agentName ?? null,
      agentPhone: donor.agentPhone ?? null,
      address: donor.address ?? null,
      notes: donor.notes ?? null,
      reminderHoursBefore: 2,
    },
  });
  return client.supplier.findUniqueOrThrow({ where: { id: spec.canonicalId } });
}

async function reassignCompositeOrDelete<T extends { id: string }>(
  rows: T[],
  findClash: (row: T) => Promise<unknown>,
  update: (row: T) => Promise<unknown>,
  remove: (row: T) => Promise<unknown>,
) {
  for (const row of rows) {
    if (await findClash(row)) await remove(row);
    else await update(row);
  }
}

async function mergeProductIntoCanonical(client: PrismaClient, product: { id: string; name: string; sku: string | null }, canonicalId: string) {
  const match = product.sku
    ? await client.product.findFirst({
        where: { supplierId: canonicalId, sku: product.sku, NOT: { id: product.id } },
      })
    : await client.product.findFirst({
        where: { supplierId: canonicalId, name: product.name, NOT: { id: product.id } },
      });

  if (!match) {
    await client.product.update({ where: { id: product.id }, data: { supplierId: canonicalId } });
    return;
  }

  await client.orderLine.updateMany({ where: { productId: product.id }, data: { productId: match.id } });
  await client.inventoryCountLine.updateMany({ where: { productId: product.id }, data: { productId: match.id } });
  await client.wasteEntry.updateMany({ where: { productId: product.id }, data: { productId: match.id } });
  await client.dishComponent.updateMany({ where: { productId: product.id }, data: { productId: match.id } });

  const suggestions = await client.orderStandardSuggestion.findMany({ where: { productId: product.id } });
  await reassignCompositeOrDelete(
    suggestions,
    (row) =>
      client.orderStandardSuggestion.findUnique({
        where: {
          branchId_productId_periodMonth: {
            branchId: row.branchId,
            productId: match.id,
            periodMonth: row.periodMonth,
          },
        },
      }),
    (row) => client.orderStandardSuggestion.update({ where: { id: row.id }, data: { productId: match.id } }),
    (row) => client.orderStandardSuggestion.delete({ where: { id: row.id } }),
  );

  await client.priceListItem.deleteMany({ where: { productId: product.id } });
  await client.product.delete({ where: { id: product.id } });
}

async function syncCanonicalPriceLists(client: PrismaClient, supplierId: string) {
  await client.priceList.upsert({
    where: { supplierId_kind: { supplierId, kind: PRICE_LIST_KIND.FRANCHISEE } },
    update: { name: "מחירון זכיין" },
    create: { supplierId, kind: PRICE_LIST_KIND.FRANCHISEE, name: "מחירון זכיין" },
  });
  await client.priceList.upsert({
    where: { supplierId_kind: { supplierId, kind: PRICE_LIST_KIND.NETWORK } },
    update: { name: "מחירון רשת" },
    create: { supplierId, kind: PRICE_LIST_KIND.NETWORK, name: "מחירון רשת" },
  });
  const lists = await client.priceList.findMany({ where: { supplierId } });
  const products = await client.product.findMany({ where: { supplierId } });
  for (const product of products) {
    for (const list of lists) {
      const isNetwork = list.kind === PRICE_LIST_KIND.NETWORK;
      await client.priceListItem.upsert({
        where: { priceListId_productId: { priceListId: list.id, productId: product.id } },
        create: {
          priceListId: list.id,
          productId: product.id,
          unitPrice: product.agreedPrice,
          discountPercent: product.discountPercent,
          rebatePercent: isNetwork ? product.networkRebatePercent : 0,
          plusPercent: isNetwork ? product.networkPlusPercent : 0,
        },
        update: {
          unitPrice: product.agreedPrice,
          discountPercent: product.discountPercent,
          rebatePercent: isNetwork ? product.networkRebatePercent : 0,
          plusPercent: isNetwork ? product.networkPlusPercent : 0,
        },
      });
    }
  }
}

async function reassignSupplierRecords(client: PrismaClient, fromId: string, toId: string) {
  if (fromId === toId) return;

  const products = await client.product.findMany({ where: { supplierId: fromId } });
  for (const product of products) {
    await mergeProductIntoCanonical(client, product, toId);
  }

  await client.order.updateMany({ where: { supplierId: fromId }, data: { supplierId: toId } });
  await client.exceptionalItem.updateMany({ where: { supplierId: fromId }, data: { supplierId: toId } });

  const links = await client.supplierBranch.findMany({ where: { supplierId: fromId } });
  for (const link of links) {
    const clash = await client.supplierBranch.findUnique({
      where: { supplierId_branchId: { supplierId: toId, branchId: link.branchId } },
    });
    if (clash) {
      await client.supplierBranch.delete({
        where: { supplierId_branchId: { supplierId: fromId, branchId: link.branchId } },
      });
    } else {
      await client.supplierBranch.update({
        where: { supplierId_branchId: { supplierId: fromId, branchId: link.branchId } },
        data: { supplierId: toId },
      });
    }
  }

  const apMonths = await client.supplierApMonth.findMany({ where: { supplierId: fromId } });
  await reassignCompositeOrDelete(
    apMonths,
    (row) => client.supplierApMonth.findUnique({ where: { supplierId_month: { supplierId: toId, month: row.month } } }),
    (row) => client.supplierApMonth.update({ where: { id: row.id }, data: { supplierId: toId } }),
    (row) => client.supplierApMonth.delete({ where: { id: row.id } }),
  );

  const reminders = await client.orderCutoffReminder.findMany({ where: { supplierId: fromId } });
  await reassignCompositeOrDelete(
    reminders,
    (row) =>
      client.orderCutoffReminder.findUnique({
        where: { supplierId_branchId_dateKey: { supplierId: toId, branchId: row.branchId, dateKey: row.dateKey } },
      }),
    (row) => client.orderCutoffReminder.update({ where: { id: row.id }, data: { supplierId: toId } }),
    (row) => client.orderCutoffReminder.delete({ where: { id: row.id } }),
  );

  // Duplicate price lists cannot move onto the canonical (unique supplierId+kind). Items were
  // either moved with products or discarded; canonical lists are rebuilt after delete.
  await client.priceList.deleteMany({ where: { supplierId: fromId } });
}

export async function findMergeDuplicates(client: PrismaClient, spec: SupplierMergeSpec) {
  const rows = await client.supplier.findMany({
    select: { id: true, name: true, taxId: true, whatsappPhone: true, documentType: true, deliveryDays: true, orderDays: true, orderCutoffTime: true, agentName: true, agentPhone: true, address: true, notes: true },
  });
  return rows.filter((row) => {
    if (row.id === spec.canonicalId) return false;
    if (spec.duplicateIds.includes(row.id)) return true;
    if (spec.isAliasName(row.name)) return true;
    return Boolean(spec.taxId && normalizeTaxId(row.taxId) === normalizeTaxId(spec.taxId));
  });
}

/**
 * Production-safe: reassigns FKs onto the canonical supplier, then deletes the duplicate.
 * Does not wipe unrelated catalog or open orders — orders are moved, not dropped.
 */
export async function mergeSuppliersIntoCanonical(client: PrismaClient, spec: SupplierMergeSpec) {
  const duplicates = await findMergeDuplicates(client, spec);
  if (duplicates.length === 0) {
    const canonical = await client.supplier.findUnique({ where: { id: spec.canonicalId } });
    if (canonical) {
      await client.supplier.update({
        where: { id: spec.canonicalId },
        data: { name: spec.canonicalName, active: true },
      });
    }
    return { mergedIds: [] as string[] };
  }

  await ensureCanonicalSupplier(client, spec, duplicates[0]);

  const mergedIds: string[] = [];
  for (const duplicate of duplicates) {
    const stillThere = await client.supplier.findUnique({ where: { id: duplicate.id } });
    if (!stillThere) continue;
    await reassignSupplierRecords(client, duplicate.id, spec.canonicalId);
    await client.supplier.delete({ where: { id: duplicate.id } });
    mergedIds.push(duplicate.id);
  }

  await client.supplier.update({
    where: { id: spec.canonicalId },
    data: { name: spec.canonicalName, active: true },
  });
  await syncCanonicalPriceLists(client, spec.canonicalId);

  return { mergedIds };
}

export async function mergeSemoryDuplicates(client: PrismaClient) {
  return mergeSuppliersIntoCanonical(client, SEMORY_MERGE);
}
