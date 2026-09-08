"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createRecurringLine(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amountIls = Number(formData.get("amountIls") ?? 0);
  if (!name) throw new Error("יש למלא שם");
  if (!Number.isFinite(amountIls)) throw new Error("סכום לא חוקי");
  await prisma.recurringLine.create({
    data: {
      name,
      kind: String(formData.get("kind") ?? "EXPENSE") === "INCOME" ? "INCOME" : "EXPENSE",
      cadence: String(formData.get("cadence") ?? "FIXED") === "VARIABLE" ? "VARIABLE" : "FIXED",
      amountIls,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  revalidatePath("/foodcost");
  revalidatePath("/settings");
}

export async function deleteRecurringLine(id: string) {
  await prisma.recurringLine.delete({ where: { id } });
  revalidatePath("/foodcost");
  revalidatePath("/settings");
}
