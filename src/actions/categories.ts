"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!name) throw new Error("יש למלא שם קטגוריה");
  if (parentId) {
    const parent = await prisma.productCategory.findUnique({ where: { id: parentId } });
    if (!parent || parent.parentId) throw new Error("תת־קטגוריה רק תחת קטגוריית אב");
  }
  const siblings = await prisma.productCategory.count({ where: { parentId } });
  await prisma.productCategory.create({
    data: {
      id: `pcat_${Date.now().toString(36)}`,
      name,
      parentId,
      sortOrder: (parentId ? 1 : 100) * siblings + 1,
    },
  });
  revalidatePath("/categories");
}

export async function renameCategory(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("יש למלא שם");
  await prisma.productCategory.update({ where: { id }, data: { name } });
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const used = await prisma.product.count({ where: { categoryId: id } });
  const children = await prisma.productCategory.count({ where: { parentId: id } });
  if (used > 0) throw new Error("לא ניתן למחוק קטגוריה עם מוצרים");
  if (children > 0) throw new Error("מחקו קודם את תתי־הקטגוריות");
  await prisma.productCategory.delete({ where: { id } });
  revalidatePath("/categories");
}
