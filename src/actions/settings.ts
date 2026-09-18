"use server";

import { revalidatePath } from "next/cache";
import { saveSendToSuppliersEnabled } from "@/lib/whatsapp-routing";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";
import { ACCOUNTANT_EMAIL_KEY, ACCOUNTANT_FOLDER_KEY, ACCOUNTANT_WHATSAPP_KEY } from "@/lib/accountant-export";
import { prisma } from "@/lib/prisma";

export async function setSendToSuppliers(enabled: boolean | FormData) {
  const session = await requirePermission("action.toggle_send_to_suppliers");
  const value =
    typeof enabled === "boolean"
      ? enabled
      : ["true", "1", "on", "yes"].includes(String(enabled.get("enabled") ?? "").trim().toLowerCase());
  await saveSendToSuppliersEnabled(value);
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.SETTINGS_SEND_TO_SUPPLIERS,
    entityType: "AppSetting",
    entityId: "orders.sendToSuppliers",
    summary: value ? "הופעלה שליחה לספקים" : "כובתה שליחה לספקים (מצב בדיקה)",
    meta: { enabled: value },
  });
  revalidatePath("/", "layout");
}

export async function saveAccountantExportSettings(formData: FormData) {
  const session = await requirePermission("action.manage_settings");
  const whatsapp = String(formData.get("accountantWhatsapp") ?? "").trim();
  const email = String(formData.get("accountantEmail") ?? "").trim();
  const folder = String(formData.get("accountantFolder") ?? "").trim();
  await prisma.appSetting.upsert({
    where: { key: ACCOUNTANT_WHATSAPP_KEY },
    update: { value: whatsapp },
    create: { key: ACCOUNTANT_WHATSAPP_KEY, value: whatsapp },
  });
  await prisma.appSetting.upsert({
    where: { key: ACCOUNTANT_EMAIL_KEY },
    update: { value: email },
    create: { key: ACCOUNTANT_EMAIL_KEY, value: email },
  });
  await prisma.appSetting.upsert({
    where: { key: ACCOUNTANT_FOLDER_KEY },
    update: { value: folder },
    create: { key: ACCOUNTANT_FOLDER_KEY, value: folder },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.SETTINGS_SEND_TO_SUPPLIERS,
    entityType: "AppSetting",
    entityId: ACCOUNTANT_WHATSAPP_KEY,
    summary: "עודכנו פרטי ייצוא להנה״ח",
  });
  revalidatePath("/settings");
  revalidatePath("/invoices/package");
}
