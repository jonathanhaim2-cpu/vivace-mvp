import { pickExpenseMatch } from "@/lib/expense-match";
import { prisma } from "@/lib/prisma";

/** Auto-assign an approved invoice. A manual link is left in place. */
export async function assignInvoiceExpense(photoId: string) {
  const photo = await prisma.invoicePhoto.findUnique({
    where: { id: photoId },
    include: {
      expenseLink: true,
      goodsReceipt: { include: { order: { include: { supplier: true } } } },
    },
  });
  if (!photo || photo.approvalStatus !== "APPROVED" || photo.isDuplicate) return;
  if (photo.expenseLink?.source === "MANUAL") return;

  const [expenses, suppliers] = await Promise.all([
    prisma.recurringLine.findMany({ where: { active: true, kind: "EXPENSE" } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
  ]);
  const linkedSupplier = photo.goodsReceipt?.order.supplier ?? null;
  const named =
    linkedSupplier ??
    suppliers.find(
      (supplier) =>
        photo.aiSupplierName &&
        supplier.name.trim().toLocaleLowerCase("he") === photo.aiSupplierName.trim().toLocaleLowerCase("he"),
    ) ??
    null;
  const match = pickExpenseMatch(
    {
      supplierId: named?.id ?? null,
      supplierName: named?.name ?? photo.aiSupplierName,
      text: [photo.originalName, photo.voiceNoteText, photo.aiReason, photo.aiSupplierName].filter(Boolean).join(" "),
      branchId: photo.branchId,
    },
    expenses,
  );

  if (!match) {
    if (photo.expenseLink?.source === "AUTO") {
      await prisma.invoiceExpenseLink.delete({ where: { id: photo.expenseLink.id } });
    }
    return;
  }

  await prisma.invoiceExpenseLink.upsert({
    where: { invoicePhotoId: photo.id },
    create: { invoicePhotoId: photo.id, recurringLineId: match.id, source: "AUTO" },
    update: { recurringLineId: match.id, source: "AUTO" },
  });
}
