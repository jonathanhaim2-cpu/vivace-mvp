import Link from "next/link";
import { notFound } from "next/navigation";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { OrderCompanyHeader } from "@/components/orders/order-company-header";
import { WhatsAppButton } from "@/components/orders/whatsapp-button";
import { WhatsAppTicks } from "@/components/orders/whatsapp-ticks";
import { PrintOnLoad } from "@/components/print-on-load";
import { OrderStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  describePackaging,
  formatDateTime,
  formatIls,
  lineTotal,
  nextOrderWindow,
  resolveOrderDays,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildOrderWhatsAppText, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: true,
      branch: true,
      receipt: true,
      lines: { include: { product: true } },
    },
  });
  if (!order) notFound();

  const total = order.lines.reduce(
    (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
    0,
  );
  const message = buildOrderWhatsAppText(order);
  const whatsappHref = buildWhatsAppUrl(order.supplier.whatsappPhone, message);
  const nextOrder = nextOrderWindow(
    resolveOrderDays(order.supplier.orderDays, order.supplier.deliveryDays),
    order.supplier.orderCutoffTime,
    order.supplier.reminderHoursBefore,
  );

  return (
    <div className="space-y-6">
      <PrintOnLoad enabled={print === "1"} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{order.supplier.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.branch.name} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>סיכום להזמנה</CardTitle>
          <CardDescription>קודם פרטי העסק, ואחר כך שורות ההזמנה — כך זה נשלח לספק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderCompanyHeader branch={order.branch} />
          <ul className="space-y-2 text-sm">
            {order.lines.map((line) => {
              const pack = describePackaging(line.qty, line.product.cartonToBags, line.product.bagsToUnits);
              return (
                <li key={line.id} className="flex justify-between gap-4">
                  <span>
                    {line.product.name} × {line.qty}
                    {pack ? ` (${pack})` : ""}
                  </span>
                  <span>{formatIls(lineTotal(line.qty, line.unitPrice, line.discountPercent))}</span>
                </li>
              );
            })}
          </ul>
          <p className="font-medium">סה״כ משוער: {formatIls(total)}</p>
          <p className="text-sm text-muted-foreground">הערות למפיץ: {order.notesForDriver || "אין"}</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap print:border print:bg-white">
            {message}
          </pre>
          <div className="flex flex-wrap gap-2 print:hidden">
            <WhatsAppButton orderId={order.id} href={whatsappHref} />
            <Link href={`/orders/${order.id}?print=1`} className={cn(buttonVariants({ variant: "outline" }))}>
              הדפסה / PDF
            </Link>
            {!order.receipt ? (
              <Link href={`/orders/${order.id}/receive`} className={cn(buttonVariants({ variant: "secondary" }))}>
                קליטת סחורה
              </Link>
            ) : (
              <Link href={`/receipts/${order.receipt.id}`} className={cn(buttonVariants({ variant: "secondary" }))}>
                צפייה בקליטה
              </Link>
            )}
          </div>
          <div className="space-y-1 print:hidden">
            <p className="text-xs text-muted-foreground">
              {order.receipt ? "סחורה: נקלטה" : "סחורה: טרם נקלטה"}
            </p>
            <WhatsAppTicks orderId={order.id} status={order.whatsappStatus} />
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>ההזמנה הקרובה לספק</CardTitle>
        </CardHeader>
        <CardContent>
          <NextOrderNotice info={nextOrder} />
        </CardContent>
      </Card>
    </div>
  );
}
