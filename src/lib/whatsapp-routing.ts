import { ROI_WHATSAPP_PHONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const SEND_TO_SUPPLIERS_SETTING_KEY = "orders.sendToSuppliers";

export function isSendToSuppliersValue(raw: string | null | undefined) {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

/** OFF (default): Roi. ON: branch override, then supplier catalog phone. */
export function resolveOrderWhatsAppPhone(input: {
  sendToSuppliers: boolean;
  supplierPhone?: string | null;
  branchPhone?: string | null;
}) {
  if (!input.sendToSuppliers) return ROI_WHATSAPP_PHONE;
  const branch = input.branchPhone?.trim();
  if (branch) return branch;
  const supplier = input.supplierPhone?.trim();
  if (supplier) return supplier;
  return ROI_WHATSAPP_PHONE;
}

export async function getSendToSuppliersEnabled() {
  const row = await prisma.appSetting.findUnique({ where: { key: SEND_TO_SUPPLIERS_SETTING_KEY } });
  return isSendToSuppliersValue(row?.value);
}

export async function saveSendToSuppliersEnabled(enabled: boolean) {
  await prisma.appSetting.upsert({
    where: { key: SEND_TO_SUPPLIERS_SETTING_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: SEND_TO_SUPPLIERS_SETTING_KEY, value: enabled ? "true" : "false" },
  });
}
