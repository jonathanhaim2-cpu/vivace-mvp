import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isAwaitingGoodsReceiving } from "@/lib/goods-receiving";
import { formatDate, formatIls, lineTotal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { backfillSupplierOrderableOnce } from "@/lib/supplier-orderable";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GoodsReceivingPage() {
  const session = await getAppSession();
  await backfillSupplierOrderableOnce();
  const orders = await prisma.order.findMany({
    where: session.isNetwork
      ? { receipt: null }
      : { receipt: null, branchId: session.branchId ?? undefined },
    include: {
      supplier: true,
      branch: true,
      lines: { include: { product: true }, take: 3 },
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const open = orders.filter((order) =>
    isAwaitingGoodsReceiving({
      status: order.status,
      hasReceipt: false,
      supplierIsOrderable: order.supplier.isOrderable,
    }),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="קליטת סחורה"
        description="הזמנות פתוחות שטרם נקלטו, ורק מספקים שמסומנים כספק הזמנות."
      />
      {open.length === 0 ? (
        <EmptyState title="אין קליטות ממתינות" description="כשתצא הזמנה לספק הזמנות היא תופיע כאן עד הקליטה." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {open.map((order) => {
            const total = order.lines.reduce(
              (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
              0,
            );
            const initial = order.supplier.name.trim().slice(0, 1);
            return (
              <li key={order.id} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-lg font-semibold text-brand-green">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{order.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.branch.name}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {order._count.lines} פריטים
                  {order.lines.length > 0
                    ? ` · ${order.lines.map((line) => line.product.name).join(" · ")}`
                    : ""}
                  {order._count.lines > order.lines.length ? "…" : ""}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatIls(total)}</p>
                  <Link href={`/orders/${order.id}/receive`} className={cn(buttonVariants({ size: "sm" }))}>
                    קליטת סחורה
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
