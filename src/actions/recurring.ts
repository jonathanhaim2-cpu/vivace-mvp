"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/access";
import { sessionCan } from "@/lib/session";

async function requireExpenseEdit() {
  const session = await requireSession();
  if (sessionCan(session, "nav.ap") || sessionCan(session, "nav.foodcost")) return session;
  await requirePermission("nav.ap");
  return session;
}

export async function createRecurringLine(formData: FormData) {
  await requireExpenseEdit();
  const name = String(formData.get("name") ?? "").trim();
  const amountIls = Number(formData.get("amountIls") ?? 0);
  if (!name) throw new Error("יש למלא שם");
  if (!Number.isFinite(amountIls)) throw new Error("סכום לא חוקי");
  const chargeDayRaw = String(formData.get("chargeDay") ?? "").trim();
  const chargeDay = chargeDayRaw ? Number(chargeDayRaw) : null;
  await prisma.recurringLine.create({
    data: {
      name,
      kind: String(formData.get("kind") ?? "EXPENSE") === "INCOME" ? "INCOME" : "EXPENSE",
      cadence: String(formData.get("cadence") ?? "FIXED") === "VARIABLE" ? "VARIABLE" : "FIXED",
      amountIls,
      notes: String(formData.get("notes") ?? "").trim() || null,
      paymentMethod: String(formData.get("paymentMethod") ?? "").trim() || null,
      chargeDay: chargeDay != null && Number.isFinite(chargeDay) ? Math.min(28, Math.max(1, Math.round(chargeDay))) : 1,
    },
  });
  revalidatePath("/foodcost");
  revalidatePath("/expenses");
  revalidatePath("/reports/cashflow");
  revalidatePath("/settings");
}

export async function deleteRecurringLine(id: string) {
  await requireExpenseEdit();
  await prisma.recurringLine.delete({ where: { id } });
  revalidatePath("/foodcost");
  revalidatePath("/expenses");
  revalidatePath("/reports/cashflow");
  revalidatePath("/settings");
}
