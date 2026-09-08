import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { prisma } from "@/lib/prisma";

export async function seedProductCategories() {
  for (const [parentIndex, parent] of PRODUCT_CATEGORIES.entries()) {
    await prisma.productCategory.upsert({
      where: { id: parent.id },
      update: {
        name: parent.name,
        parentId: null,
        sortOrder: parentIndex * 100,
        accountId: parent.accountId,
      },
      create: {
        id: parent.id,
        name: parent.name,
        parentId: null,
        sortOrder: parentIndex * 100,
        accountId: parent.accountId,
      },
    });
    for (const [childIndex, child] of parent.children.entries()) {
      await prisma.productCategory.upsert({
        where: { id: child.id },
        update: {
          name: child.name,
          parentId: parent.id,
          sortOrder: parentIndex * 100 + childIndex + 1,
          accountId: child.accountId ?? parent.accountId,
        },
        create: {
          id: child.id,
          name: child.name,
          parentId: parent.id,
          sortOrder: parentIndex * 100 + childIndex + 1,
          accountId: child.accountId ?? parent.accountId,
        },
      });
    }
  }
}

export async function listCategoryTree() {
  return prisma.productCategory.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
}

export function categoryPathLabel(
  category: { name: string; parent?: { name: string } | null } | null | undefined,
) {
  if (!category) return "ללא קטגוריה";
  if (category.parent) return `${category.parent.name} · ${category.name}`;
  return category.name;
}
