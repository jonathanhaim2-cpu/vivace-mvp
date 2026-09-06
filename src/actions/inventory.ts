"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export async function createInventoryCount(formData: FormData) {
  const session = await getAppSession();
  const branchId = String(formData.get("branchId") || session.branchId || "");
  if (!branchId) throw new Error("יש לבחור סניף");
  const countedOn = String(formData.get("countedOn") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const products = await prisma.product.findMany({ select: { id: true } });

  const count = await prisma.inventoryCount.create({
    data: {
      branchId,
      countedOn: countedOn ? new Date(`${countedOn}T12:00:00`) : new Date(),
      status: "OPEN",
      notes,
      lines: {
        create: products.map((product) => ({
          productId: product.id,
          countedQty: Number(formData.get(`qty:${product.id}`) ?? 0) || 0,
        })),
      },
    },
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${count.id}`);
}

export async function saveInventoryCount(countId: string, formData: FormData) {
  const count = await prisma.inventoryCount.findUnique({
    where: { id: countId },
    include: { lines: true },
  });
  if (!count) throw new Error("ספירה לא נמצאה");
  if (count.status !== "OPEN") throw new Error("ספירה שנסגרה לא ניתנת לעריכה");

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const countedOn = String(formData.get("countedOn") ?? "").trim();

  await prisma.$transaction([
    prisma.inventoryCount.update({
      where: { id: countId },
      data: {
        notes,
        countedOn: countedOn ? new Date(`${countedOn}T12:00:00`) : count.countedOn,
      },
    }),
    ...count.lines.map((line) =>
      prisma.inventoryCountLine.update({
        where: { id: line.id },
        data: { countedQty: Number(formData.get(`qty:${line.productId}`) ?? line.countedQty) || 0 },
      }),
    ),
  ]);

  revalidatePath(`/inventory/${countId}`);
  revalidatePath("/inventory");
}

export async function submitInventoryCount(countId: string) {
  await prisma.inventoryCount.update({
    where: { id: countId },
    data: { status: "SUBMITTED" },
  });
  revalidatePath(`/inventory/${countId}`);
  revalidatePath("/inventory");
}
