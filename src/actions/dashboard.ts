"use server";

import { revalidatePath } from "next/cache";
import { saveForecastTurnover } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export async function saveDashboardSettings(formData: FormData) {
  const forecast = Number(formData.get("forecastTurnoverIls") ?? 0);
  if (!Number.isFinite(forecast) || forecast < 0) {
    throw new Error("מחזור חזוי לא חוקי");
  }
  await saveForecastTurnover(forecast);

  const parents = await prisma.productCategory.findMany({ where: { parentId: null } });
  for (const parent of parents) {
    const raw = String(formData.get(`target:${parent.id}`) ?? "").trim();
    const value = raw ? Number(raw) : null;
    await prisma.productCategory.update({
      where: { id: parent.id },
      data: { targetPercent: value != null && Number.isFinite(value) ? value : null },
    });
  }
  revalidatePath("/");
  revalidatePath("/settings");
}
