import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/status-badge";
import { COMPANY, RECEIPT_STATUSES } from "@/lib/constants";
import {
  formatDateTime,
  formatDeliveryDays,
  nextDeliveryInfo,
  parseDeliveryDays,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await getAppSession();
  const [suppliers, openOrders, pendingApprovals, recentOrders] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.order.count({
      where: { status: { in: ["CONFIRMED", "SENT"] }, ...(session.isNetwork ? {} : { branchId: session.branchId ?? undefined }) },
    }),
    prisma.goodsReceipt.count({
      where: { status: RECEIPT_STATUSES.PENDING_PRICE_APPROVAL },
    }),
    prisma.order.findMany({
      where: session.isNetwork ? {} : { branchId: session.branchId ?? undefined },
      include: { supplier: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {COMPANY.nameHe} · עוסק מורשה {COMPANY.taxId} · בעלים {COMPANY.owner}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
          {session.isNetwork ? "משרד הרשת" : session.branch?.name ?? "סניף"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          רכש, קליטת סחורה וצילום חשבוניות. מתכונים, Tabit, דוחות AI ורווחיות זכיינים מחוץ ל-MVP.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="ספקים פעילים" value={String(suppliers.length)} href="/suppliers" />
        <StatCard label="הזמנות פתוחות" value={String(openOrders)} href="/orders" />
        <StatCard
          label="ממתינות לאישור מחיר"
          value={String(pendingApprovals)}
          href="/receipts"
          warn={pendingApprovals > 0}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/orders/new" className={cn(buttonVariants())}>
          הזמנה חדשה
        </Link>
        <Link href="/suppliers/new" className={cn(buttonVariants({ variant: "outline" }))}>
          ספק חדש
        </Link>
        <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
          העלאת חשבונית
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>חלונות אספקה</CardTitle>
          <CardDescription>לפי ימי חלוקה ושעת סגירה של כל ספק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suppliers.map((supplier) => {
            const info = nextDeliveryInfo(parseDeliveryDays(supplier.deliveryDays), supplier.orderCutoffTime);
            return (
              <div key={supplier.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDeliveryDays(supplier.deliveryDays)} · סגירה {supplier.orderCutoffTime} · תזכורת {supplier.reminderHoursBefore} שע׳ לפני
                  </p>
                </div>
                <p className={cn("text-sm", info.open ? "text-primary" : "text-destructive")}>{info.label}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הזמנות אחרונות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">עדיין אין הזמנות.</p>
          ) : (
            recentOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 hover:bg-muted/60">
                <div>
                  <p className="font-medium">{order.supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.branch.name} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  warn,
}: {
  label: string;
  value: string;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={warn ? "ring-1 ring-destructive/40" : undefined}>
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-3xl">{value}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}
