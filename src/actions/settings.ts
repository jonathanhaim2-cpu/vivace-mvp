"use server";

import { revalidatePath } from "next/cache";
import { saveSendToSuppliersEnabled } from "@/lib/whatsapp-routing";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";

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
