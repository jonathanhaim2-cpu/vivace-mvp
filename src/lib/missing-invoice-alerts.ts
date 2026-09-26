import {
  expectedInvoicesPerMonth,
  fixedExpenseMessage,
  isFixedExpenseMissing,
  isInvoiceCountShort,
  missingSupplierInvoicesMessage,
  monthKeyOf,
  previousFullMonthKeys,
  type CivilDate,
} from "@/lib/missing-invoices";
import { pnlMonthKey } from "@/lib/pnl-month";
import { prisma } from "@/lib/prisma";

export type MissingInvoiceAlert = {
  id: string;
  tone: "fixed" | "supplier";
  name: string;
  message: string;
  href: string;
};

type PhotoRow = {
  id: string;
  branchId: string | null;
  aiInvoiceDate: string | null;
  aiSupplierName: string | null;
  createdAt: Date;
  documentType: string;
  amountIls: number | null;
  aiTotalIls: number | null;
  supplierId: string | null;
};

function photoMonth(photo: PhotoRow) {
  return pnlMonthKey({ invoiceDate: photo.aiInvoiceDate, createdAt: photo.createdAt });
}

export async function listMissingInvoiceAlerts(input: {
  today: CivilDate;
  branchId?: string | null;
}): Promise<MissingInvoiceAlert[]> {
  const current = monthKeyOf(input.today);
  const history = previousFullMonthKeys(input.today, 3);
  const [expenses, suppliers, photos, links] = await Promise.all([
    prisma.recurringLine.findMany({
      where: { active: true, kind: "EXPENSE" },
      include: { supplier: { select: { id: true, name: true } } },
    }),
    prisma.supplier.findMany({
      where: { isOrderable: true, active: true },
      select: { id: true, name: true },
    }),
    prisma.invoicePhoto.findMany({
      where: { isDuplicate: false, approvalStatus: "APPROVED" },
      select: {
        id: true,
        branchId: true,
        aiInvoiceDate: true,
        aiSupplierName: true,
        createdAt: true,
        documentType: true,
        amountIls: true,
        aiTotalIls: true,
        goodsReceipt: { select: { order: { select: { supplierId: true } } } },
      },
    }),
    prisma.invoiceExpenseLink.findMany({
      select: { invoicePhotoId: true, recurringLineId: true },
    }),
  ]);

  const rows: PhotoRow[] = photos.map((photo) => ({
    id: photo.id,
    branchId: photo.branchId,
    aiInvoiceDate: photo.aiInvoiceDate,
    aiSupplierName: photo.aiSupplierName,
    createdAt: photo.createdAt,
    documentType: photo.documentType,
    amountIls: photo.amountIls,
    aiTotalIls: photo.aiTotalIls,
    supplierId: photo.goodsReceipt?.order.supplierId ?? null,
  }));
  const inBranch = (photo: PhotoRow) => !input.branchId || photo.branchId === input.branchId || photo.branchId == null;
  const linkByPhoto = new Map(links.map((link) => [link.invoicePhotoId, link.recurringLineId]));
  const alerts: MissingInvoiceAlert[] = [];

  const visibleExpenses = expenses.filter(
    (row) => !input.branchId || !row.branchId || row.branchId === input.branchId,
  );

  for (const expense of visibleExpenses.filter((row) => row.cadence === "FIXED")) {
    const matched = rows.filter(
      (photo) => linkByPhoto.get(photo.id) === expense.id && photoMonth(photo) === current && inBranch(photo),
    );
    if (
      isFixedExpenseMissing({
        chargeDay: expense.chargeDay,
        today: input.today,
        matchedInvoiceCountThisMonth: matched.length,
        active: expense.active,
      })
    ) {
      alerts.push({
        id: `fixed:${expense.id}`,
        tone: "fixed",
        name: expense.name,
        message: fixedExpenseMessage(expense.name),
        href: "/expenses",
      });
    }
  }

  function countSupplier(supplierId: string, supplierName: string, month: string) {
    return rows.filter((photo) => {
      if (photoMonth(photo) !== month || !inBranch(photo)) return false;
      if (photo.supplierId === supplierId) return true;
      return (
        photo.aiSupplierName != null &&
        photo.aiSupplierName.trim().toLocaleLowerCase("he") === supplierName.trim().toLocaleLowerCase("he")
      );
    }).length;
  }

  const coveredSuppliers = new Set(
    visibleExpenses.filter((row) => row.cadence === "VARIABLE" && row.supplierId).map((row) => row.supplierId as string),
  );

  for (const expense of visibleExpenses.filter((row) => row.cadence === "VARIABLE")) {
    const expected = expectedInvoicesPerMonth({
      countsLast3FullMonths: history.map((month) =>
        expense.supplier
          ? countSupplier(expense.supplier.id, expense.supplier.name, month)
          : rows.filter((photo) => linkByPhoto.get(photo.id) === expense.id && photoMonth(photo) === month).length,
      ),
      manualOverride: expense.expectedInvoicesPerMonth,
    });
    const arrived = expense.supplier
      ? countSupplier(expense.supplier.id, expense.supplier.name, current)
      : rows.filter((photo) => linkByPhoto.get(photo.id) === expense.id && photoMonth(photo) === current).length;
    if (isInvoiceCountShort(arrived, expected)) {
      alerts.push({
        id: `variable:${expense.id}`,
        tone: "supplier",
        name: expense.name,
        message: missingSupplierInvoicesMessage(expense.name, arrived, expected),
        href: "/expenses",
      });
    }
  }

  for (const supplier of suppliers) {
    if (coveredSuppliers.has(supplier.id)) continue;
    const expected = expectedInvoicesPerMonth({
      countsLast3FullMonths: history.map((month) => countSupplier(supplier.id, supplier.name, month)),
    });
    const arrived = countSupplier(supplier.id, supplier.name, current);
    if (isInvoiceCountShort(arrived, expected)) {
      alerts.push({
        id: `supplier:${supplier.id}`,
        tone: "supplier",
        name: supplier.name,
        message: missingSupplierInvoicesMessage(supplier.name, arrived, expected),
        href: `/suppliers/${supplier.id}`,
      });
    }
  }

  return alerts;
}
