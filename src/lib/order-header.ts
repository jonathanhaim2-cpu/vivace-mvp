import { COMPANY, ROI_WHATSAPP_PHONE } from "@/lib/constants";

export type OrderHeaderBranch = {
  name: string;
  address?: string | null;
  phone?: string | null;
  contactName?: string | null;
};

export function resolveBranchContact(branch: OrderHeaderBranch) {
  return {
    name: branch.name,
    address: branch.address?.trim() || "—",
    phone: branch.phone?.trim() || COMPANY.phone || ROI_WHATSAPP_PHONE,
    contactName: branch.contactName?.trim() || COMPANY.owner,
  };
}

/** Company block that must appear before order lines (WhatsApp, print, on-screen). */
export function buildOrderHeaderLines(branch: OrderHeaderBranch): string[] {
  const contact = resolveBranchContact(branch);
  return [
    `הזמנה מטעם ${COMPANY.nameHe} / ${COMPANY.name}`,
    `סניף: ${contact.name}`,
    `כתובת: ${contact.address}`,
    `טלפון: ${contact.phone}`,
    `איש קשר: ${contact.contactName}`,
    `ח.פ. ${COMPANY.taxId}`,
  ];
}
