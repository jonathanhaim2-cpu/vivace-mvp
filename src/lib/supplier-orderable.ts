import { prisma } from "@/lib/prisma";

const BACKFILL_KEY = "backfill.supplierIsOrderable.v1";

/**
 * One-time, idempotent: suppliers that already have an order become ספק הזמנות.
 * Later edits of the flag are left alone.
 */
export async function backfillSupplierOrderableOnce() {
  const done = await prisma.appSetting.findUnique({ where: { key: BACKFILL_KEY } });
  if (done) return;
  const rows = await prisma.order.findMany({
    distinct: ["supplierId"],
    select: { supplierId: true },
  });
  const ids = rows.map((row) => row.supplierId);
  if (ids.length > 0) {
    await prisma.supplier.updateMany({
      where: { id: { in: ids }, isOrderable: false },
      data: { isOrderable: true },
    });
  }
  await prisma.appSetting.upsert({
    where: { key: BACKFILL_KEY },
    update: { value: "1" },
    create: { key: BACKFILL_KEY, value: "1" },
  });
}
