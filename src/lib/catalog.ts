import { PRICE_LIST_KIND } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

export async function ensurePriceLists(supplierId: string) {
  await prisma.priceList.upsert({
    where: { supplierId_kind: { supplierId, kind: PRICE_LIST_KIND.FRANCHISEE } },
    update: { name: "מחירון זכיין" },
    create: { supplierId, kind: PRICE_LIST_KIND.FRANCHISEE, name: "מחירון זכיין" },
  });
  await prisma.priceList.upsert({
    where: { supplierId_kind: { supplierId, kind: PRICE_LIST_KIND.NETWORK } },
    update: { name: "מחירון רשת" },
    create: { supplierId, kind: PRICE_LIST_KIND.NETWORK, name: "מחירון רשת" },
  });
}

export async function syncProductPriceLists(product: {
  id: string;
  supplierId: string;
  agreedPrice: number;
  discountPercent: number;
  networkRebatePercent: number;
  networkPlusPercent: number;
}) {
  await ensurePriceLists(product.supplierId);
  const lists = await prisma.priceList.findMany({ where: { supplierId: product.supplierId } });
  for (const list of lists) {
    const isNetwork = list.kind === PRICE_LIST_KIND.NETWORK;
    await prisma.priceListItem.upsert({
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

export function supplierVisibleToBranch(supplier: {
  active: boolean;
  branchLinks: { branchId: string }[];
}, branchId: string | null) {
  if (!supplier.active) return false;
  if (!branchId) return true;
  if (supplier.branchLinks.length === 0) return true;
  return supplier.branchLinks.some((link) => link.branchId === branchId);
}

export async function listOrderableSuppliers(opts: { role: Role; branchId: string | null }) {
  const suppliers = await prisma.supplier.findMany({
    include: { branchLinks: true },
    orderBy: { name: "asc" },
  });
  if (opts.role === "network") return suppliers;
  return suppliers.filter((supplier) => supplierVisibleToBranch(supplier, opts.branchId));
}

export async function listManagedSuppliers(opts: { role: Role; branchId: string | null }) {
  const suppliers = await prisma.supplier.findMany({
    include: {
      branchLinks: true,
      defaultCategory: { include: { parent: true } },
      _count: { select: { products: true, orders: true } },
    },
    orderBy: { name: "asc" },
  });
  if (opts.role === "network") return suppliers;
  return suppliers.filter((supplier) => supplier.active && supplierVisibleToBranch(supplier, opts.branchId));
}
