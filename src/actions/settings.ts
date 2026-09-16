"use server";

import { revalidatePath } from "next/cache";
import { saveSendToSuppliersEnabled } from "@/lib/whatsapp-routing";

export async function setSendToSuppliers(enabled: boolean | FormData) {
  const value =
    typeof enabled === "boolean"
      ? enabled
      : ["true", "1", "on", "yes"].includes(String(enabled.get("enabled") ?? "").trim().toLowerCase());
  await saveSendToSuppliersEnabled(value);
  revalidatePath("/", "layout");
}
