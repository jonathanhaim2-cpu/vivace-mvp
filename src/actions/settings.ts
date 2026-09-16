"use server";

import { revalidatePath } from "next/cache";
import { saveSendToSuppliersEnabled } from "@/lib/whatsapp-routing";
import { requirePermission } from "@/lib/access";

export async function setSendToSuppliers(enabled: boolean | FormData) {
  await requirePermission("action.toggle_send_to_suppliers");
  const value =
    typeof enabled === "boolean"
      ? enabled
      : ["true", "1", "on", "yes"].includes(String(enabled.get("enabled") ?? "").trim().toLowerCase());
  await saveSendToSuppliersEnabled(value);
  revalidatePath("/", "layout");
}
