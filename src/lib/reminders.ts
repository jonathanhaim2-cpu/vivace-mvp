import { nextOrderWindow, nowInIsrael, resolveOrderDays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { resolveSupplierForBranch } from "@/lib/supplier-branch";

export type DueCutoffReminder = {
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  cutoffTime: string;
  hoursBefore: number;
  minutesLeft: number;
  dateKey: string;
  alreadyNotified: boolean;
};

export async function listDueCutoffReminders(opts?: {
  branchId?: string | null;
  isNetwork?: boolean;
}): Promise<DueCutoffReminder[]> {
  const now = nowInIsrael();
  const dateKey = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.date).padStart(2, "0")}`;
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    include: { branchLinks: true },
    orderBy: { name: "asc" },
  });
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const targetBranches = opts?.isNetwork
    ? branches
    : branches.filter((branch) => !opts?.branchId || branch.id === opts.branchId);

  const already = await prisma.orderCutoffReminder.findMany({
    where: {
      dateKey,
      ...(opts?.branchId && !opts.isNetwork ? { branchId: opts.branchId } : {}),
    },
  });
  const notified = new Set(already.map((row) => `${row.supplierId}:${row.branchId}`));

  const openOrders = await prisma.order.findMany({
    where: { status: { in: ["CONFIRMED", "SENT"] } },
    select: { supplierId: true, branchId: true },
  });
  const open = new Set(openOrders.map((row) => `${row.supplierId}:${row.branchId}`));

  const due: DueCutoffReminder[] = [];
  for (const supplier of suppliers) {
    for (const branch of targetBranches) {
      if (!opts?.isNetwork && !supplierVisibleToBranch(supplier, branch.id)) continue;
      if (opts?.isNetwork && supplier.branchLinks.length > 0) {
        if (!supplier.branchLinks.some((link) => link.branchId === branch.id)) continue;
      }
      const resolved = resolveSupplierForBranch(supplier, branch.id);
      const orderDays = resolveOrderDays(resolved.orderDays, resolved.deliveryDays);
      const window = nextOrderWindow(orderDays, resolved.orderCutoffTime, supplier.reminderHoursBefore, now);
      if (!window.reminderDue || window.minutesLeft == null) continue;
      const key = `${supplier.id}:${branch.id}`;
      if (open.has(key)) continue;
      due.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        branchId: branch.id,
        branchName: branch.name,
        cutoffTime: resolved.orderCutoffTime,
        hoursBefore: supplier.reminderHoursBefore,
        minutesLeft: window.minutesLeft,
        dateKey,
        alreadyNotified: notified.has(key),
      });
    }
  }
  return due;
}

export async function markRemindersNotified(items: { supplierId: string; branchId: string; dateKey: string }[]) {
  for (const item of items) {
    await prisma.orderCutoffReminder.upsert({
      where: {
        supplierId_branchId_dateKey: {
          supplierId: item.supplierId,
          branchId: item.branchId,
          dateKey: item.dateKey,
        },
      },
      update: { notifiedAt: new Date() },
      create: {
        supplierId: item.supplierId,
        branchId: item.branchId,
        dateKey: item.dateKey,
      },
    });
  }
}
