"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";

function day(raw: FormDataEntryValue | null) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 15;
  return Math.min(28, Math.max(1, Math.round(value)));
}

export async function createPaymentCard(formData: FormData) {
  await requirePermission("nav.settings");
  const name = String(formData.get("name") ?? "").trim();
  const last4 = String(formData.get("last4") ?? "").replace(/\D/g, "").slice(-4);
  if (!name || last4.length !== 4) throw new Error("שם ו-4 ספרות אחרונות חובה");
  await prisma.paymentCard.create({
    data: { name, last4, billingDay: day(formData.get("billingDay")), notes: String(formData.get("notes") ?? "").trim() || null },
  });
  revalidatePath("/settings/payments");
  revalidatePath("/reports/cashflow");
}

export async function linkPaymentCard(formData: FormData) {
  await requirePermission("nav.settings");
  const cardId = String(formData.get("cardId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
  const accountId = String(formData.get("accountId") ?? "").trim() || null;
  if (!cardId || (!supplierId && !accountId)) throw new Error("בחרו כרטיס וספק או כרטיס הוצאה");
  await prisma.paymentCardLink.create({ data: { cardId, supplierId, accountId } });
  revalidatePath("/settings/payments");
  revalidatePath("/reports/cashflow");
}

export async function saveOpeningBalance(formData: FormData) {
  await requirePermission("nav.reports");
  const amount = Number(formData.get("openingBalance") ?? 0);
  if (!Number.isFinite(amount)) throw new Error("יתרה לא תקינה");
  await prisma.appSetting.upsert({
    where: { key: "cashflow.openingBalance" },
    update: { value: String(amount) },
    create: { key: "cashflow.openingBalance", value: String(amount) },
  });
  revalidatePath("/reports/cashflow");
}
