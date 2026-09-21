"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/access";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";
import { PHOTO_DOCUMENT_TYPE } from "@/lib/constants";
import { monthRangeUtc } from "@/lib/months";

export async function markInvoicesSentToAccountant(month: string, channel: "whatsapp" | "email" | "folder") {
  const session = await requirePermission("action.accounting_package");
  const { start, end } = monthRangeUtc(month);
  const result = await prisma.invoicePhoto.updateMany({
    where: {
      isDuplicate: false,
      accountId: { not: null },
      OR: [{ periodMonth: month }, { periodMonth: null, createdAt: { gte: start, lt: end } }],
      documentType: {
        in: [
          PHOTO_DOCUMENT_TYPE.INVOICE,
          PHOTO_DOCUMENT_TYPE.CREDIT_NOTE,
          PHOTO_DOCUMENT_TYPE.RECEIPT,
          PHOTO_DOCUMENT_TYPE.UNKNOWN,
        ],
      },
    },
    data: { sentToAccountant: true },
  });
  await writeAuditLog(session, {
    action: AUDIT_ACTIONS.INVOICE_CLASSIFY,
    entityType: "InvoicePhoto",
    entityId: month,
    summary: `סומנו ${result.count} מסמכים כנשלחים להנה״ח (${channel}) לחודש ${month}`,
    meta: { month, channel, count: result.count },
  });
  revalidatePath("/invoices/package");
  revalidatePath("/invoices");
}
