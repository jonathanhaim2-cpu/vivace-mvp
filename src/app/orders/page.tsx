import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { OrderStatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatIls, lineTotal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function OrdersPage() {
  const session = await getAppSession();
  const orders = await prisma.order.findMany({
    where: session.isNetwork ? {} : { branchId: session.branchId ?? undefined },
    include: {
      supplier: true,
      branch: true,
      lines: true,
      receipt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="רכש · הזמנות"
        description="הזמנה מספק, סיכום לנהג, שליחה בוואטסאפ וקליטה מול חשבונית."
        action={{ href: "/orders/new", label: "הזמנה חדשה" }}
      />
      {orders.length === 0 ? (
        <EmptyState
          title="אין הזמנות"
          description="צרו הזמנה ראשונה מספק קיים."
          action={{ href: "/orders/new", label: "התחלת הזמנה" }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const total = order.lines.reduce(
              (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
              0,
            );
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:bg-accent/30">
                  <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{order.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.branch.name} · {formatDateTime(order.createdAt)} · {formatIls(total)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      {order.receipt ? (
                        <span className="text-xs text-muted-foreground">יש קליטה</span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
