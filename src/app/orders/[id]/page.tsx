import Link from "next/link";
import { notFound } from "next/navigation";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { OrderDocument } from "@/components/orders/order-document";
import { WhatsAppButton } from "@/components/orders/whatsapp-button";
import { WhatsAppTicks } from "@/components/orders/whatsapp-ticks";
import { PrintOnLoad } from "@/components/print-on-load";
import { OrderStatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, nextOrderWindow, resolveOrderDays } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { resolveSupplierForBranch } from "@/lib/supplier-branch";
import { buildOrderWhatsAppText, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getSendToSuppliersEnabled, resolveOrderWhatsAppPhone } from "@/lib/whatsapp-routing";
import { RoiTestModeBadge } from "@/components/orders/send-to-suppliers-toggle";
import { AuditInfoButton } from "@/components/audit-info-button";
import { getAppSession, sessionCan } from "@/lib/session";
import { AUDIT_ACTIONS, firstAuditFor, formatAuditStamp } from "@/lib/audit";
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
  const session = await getAppSession();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      supplier: { include: { branchLinks: true } },
      branch: true,
      receipt: true,
      lines: { include: { product: true } },
    },
  });
  if (!order) notFound();

  const createLog = await firstAuditFor("Order", order.id, AUDIT_ACTIONS.ORDER_CREATE);

  const sendToSuppliers = await getSendToSuppliersEnabled();
  const resolvedSupplier = resolveSupplierForBranch(order.supplier, order.branchId);
  const whatsappPhone = resolveOrderWhatsAppPhone({
    sendToSuppliers,
    supplierPhone: resolvedSupplier.whatsappPhone,
  });
  const message = buildOrderWhatsAppText({
    ...order,
    supplier: {
      name: resolvedSupplier.name,
      deliveryPointNumber: resolvedSupplier.deliveryPointNumber,
    },
  });
  const whatsappHref = buildWhatsAppUrl(whatsappPhone, message);
  const nextOrder = nextOrderWindow(
    resolveOrderDays(resolvedSupplier.orderDays, resolvedSupplier.deliveryDays),
    resolvedSupplier.orderCutoffTime,
    order.supplier.reminderHoursBefore,
  );

  return (
    <div className="space-y-6">
      <PrintOnLoad enabled={print === "1"} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="font-heading text-2xl font-semibold">{order.supplier.name}</h1>
            <AuditInfoButton stamp={formatAuditStamp(createLog)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.branch.name} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
        <CardTitle>מסמך הזמנה</CardTitle>
          <CardDescription>
            קודם פרטי העסק, ואחר כך שורות ההזמנה
            {sendToSuppliers ? " — נשלח למספר הספק" : " — מצב בדיקה, נשלח לרועי"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderDocument
            branch={order.branch}
            supplierName={resolvedSupplier.name}
            deliveryPointNumber={resolvedSupplier.deliveryPointNumber}
            createdAt={order.createdAt}
            notesForDriver={order.notesForDriver}
            lines={order.lines}
          />
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap print:border print:bg-white">
            {message}
          </pre>
          <div className="flex flex-wrap gap-2 print:hidden">
            {sessionCan(session, "action.send_whatsapp") ? (
              <WhatsAppButton orderId={order.id} href={whatsappHref} />
            ) : null}
            {!sendToSuppliers ? <RoiTestModeBadge /> : (
              <span className="self-center text-xs text-muted-foreground">וואטסאפ {whatsappPhone}</span>
            )}
            <Link href={`/orders/${order.id}?print=1`} className={cn(buttonVariants({ variant: "outline" }))}>
              הדפסה / PDF
            </Link>
            {!order.receipt && sessionCan(session, "action.goods_intake") ? (
              <Link href={`/orders/${order.id}/receive`} className={cn(buttonVariants({ variant: "secondary" }))}>
                קליטת סחורה
              </Link>
            ) : order.receipt ? (
              <Link href={`/receipts/${order.receipt.id}`} className={cn(buttonVariants({ variant: "secondary" }))}>
                צפייה בקליטה
              </Link>
            ) : null}
          </div>
          <div className="space-y-1 print:hidden">
            <p className="text-xs text-muted-foreground">
              {order.receipt ? "סחורה: נקלטה" : "סחורה: טרם נקלטה"}
            </p>
            <WhatsAppTicks
              orderId={order.id}
              status={order.whatsappStatus}
              canManage={sessionCan(session, "action.send_whatsapp")}
            />
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
