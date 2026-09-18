import { COMPANY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const ACCOUNTANT_WHATSAPP_KEY = "accountant.whatsappPhone";
export const ACCOUNTANT_FOLDER_KEY = "accountant.exportFolderHint";
export const ACCOUNTANT_EMAIL_KEY = "accountant.email";

export type AccountantExportConfig = {
  whatsappPhone: string;
  email: string;
  folderHint: string;
  whatsappReady: boolean;
};

export async function getAccountantExportConfig(): Promise<AccountantExportConfig> {
  const [phone, email, folder] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: ACCOUNTANT_WHATSAPP_KEY } }),
    prisma.appSetting.findUnique({ where: { key: ACCOUNTANT_EMAIL_KEY } }),
    prisma.appSetting.findUnique({ where: { key: ACCOUNTANT_FOLDER_KEY } }),
  ]);
  const whatsappPhone = phone?.value?.trim() || "";
  return {
    whatsappPhone,
    email: email?.value?.trim() || COMPANY.accountantEmail,
    folderHint: folder?.value?.trim() || "הורדת ZIP למחשב / תיקיית הנה״ח",
    whatsappReady: Boolean(whatsappPhone),
  };
}

export function accountantWhatsAppHref(phone: string, monthLabelHe: string) {
  const text = [
    `${COMPANY.nameHe} · חבילת הנה״ח ל${monthLabelHe}`,
    "מצורפות החשבוניות (לא תעודות משלוח, לא גילול/כרטסת).",
    "אם הקבצים לא הגיעו — בקשו ZIP או מייל.",
  ].join("\n");
  return buildWhatsAppUrl(phone, text);
}
