"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function updateDishPricing(dishId: string, formData: FormData) {
  const sellPriceRaw = String(formData.get("sellPrice") ?? "").trim();
  const percentRaw = String(formData.get("standardCostPercent") ?? "").trim();
  await prisma.dish.update({
    where: { id: dishId },
    data: {
      sellPrice: sellPriceRaw ? Number(sellPriceRaw) : null,
      standardCostPercent: percentRaw ? Number(percentRaw) : 28,
    },
  });
  revalidatePath("/foodcost");
  revalidatePath(`/foodcost/${dishId}`);
}

export async function createDish(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("יש למלא שם מנה");
  const kind = String(formData.get("kind") ?? "DISH") === "INTERMEDIATE" ? "INTERMEDIATE" : "DISH";
  const sellPriceRaw = String(formData.get("sellPrice") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const dish = await prisma.dish.create({
    data: {
      name,
      kind,
      sellPrice: sellPriceRaw ? Number(sellPriceRaw) : null,
      notes,
    },
  });

  revalidatePath("/foodcost");
  redirect(`/foodcost/${dish.id}`);
}

export async function addDishComponent(dishId: string, formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const componentDishId = String(formData.get("componentDishId") ?? "").trim() || null;
  const qty = Number(formData.get("qty") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if ((!productId && !componentDishId) || productId === componentDishId) {
    throw new Error("יש לבחור מוצר גלם או מנת ביניים");
  }
  if (componentDishId === dishId) {
    throw new Error("מנה לא יכולה להכיל את עצמה");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("כמות לא חוקית");
  }

  await prisma.dishComponent.create({
    data: {
      dishId,
      productId,
      componentDishId: productId ? null : componentDishId,
      qty,
      notes,
    },
  });

  revalidatePath(`/foodcost/${dishId}`);
  revalidatePath("/foodcost");
}

export async function removeDishComponent(componentId: string, dishId: string) {
  await prisma.dishComponent.delete({ where: { id: componentId } });
  revalidatePath(`/foodcost/${dishId}`);
  revalidatePath("/foodcost");
}
