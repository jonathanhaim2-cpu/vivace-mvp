import { nowInIsrael } from "@/lib/format";
import { listMissingInvoiceAlerts } from "@/lib/missing-invoice-alerts";
import { shellExceptionCount } from "@/lib/mobile-nav";
import { prisma } from "@/lib/prisma";

/** Same rows the mobile home «חריגים» list renders, so the header bell matches that list. */
export async function countShellExceptions(branchId: string | null) {
  const clock = nowInIsrael();
  const [credits, pendingApproval, missing] = await Promise.all([
    prisma.supplierRequest.count({
      where: {
        status: "OPEN",
        kind: "CREDIT",
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.invoicePhoto.count({
      where: { isDuplicate: false, approvalStatus: "PENDING", source: "EMAIL" },
    }),
    listMissingInvoiceAlerts({
      today: { year: clock.year, month: clock.month, date: clock.date },
      branchId,
    }).then((rows) => rows.length),
  ]);
  return shellExceptionCount({ credits, pendingApproval, missingInvoices: missing });
}
