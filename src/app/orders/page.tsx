import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { WhatsAppTicks } from "@/components/orders/whatsapp-ticks";
import { OrderStatusBadge } from "@/components/status-badge";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatDateTime, formatIls, lineTotal, orderStatusLabel } from "@/lib/format";
import { monthLabel, monthRangeUtc, parseMonthParam, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; supplier?: string; q?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const status = params.status?.trim() ?? "";
  const supplierId = params.supplier?.trim() ?? "";
  const q = params.q?.trim() ?? "";
  const branchId = params.branch?.trim() ?? "";
  const range = month ? monthRangeUtc(month) : null;

  const [orders, suppliers] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(session.isNetwork
          ? branchId
            ? { branchId }
            : {}
          : { branchId: session.branchId ?? undefined }),
        ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
        ...(status ? { status } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(q ? { supplier: { name: { contains: q } } } : {}),
      },
      include: {
        supplier: true,
        branch: true,
        lines: true,
        receipt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="רכש · הזמנות"
        description="הזמנה מספק, סיכום למפיץ, שליחה בוואטסאפ וקליטה מול חשבונית."
        action={{ href: "/orders/new", label: "הזמנה חדשה" }}
      />
      <FilterBar>
        <CompactField label="חודש" htmlFor="orders-month">
          <NativeSelect id="orders-month" name="month" defaultValue={month ?? "all"}>
            <option value="all">כל החודשים</option>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="סטטוס" htmlFor="orders-status">
          <NativeSelect id="orders-status" name="status" defaultValue={status}>
            <option value="">הכל</option>
            {Object.values(ORDER_STATUSES).map((value) => (
              <option key={value} value={value}>
                {orderStatusLabel(value)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="ספק" htmlFor="orders-supplier">
          <NativeSelect id="orders-supplier" name="supplier" defaultValue={supplierId}>
            <option value="">כל הספקים</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="orders-branch">
            <NativeSelect id="orders-branch" name="branch" defaultValue={branchId}>
              <option value="">כל הסניפים</option>
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
        ) : null}
        <CompactField label="חיפוש" htmlFor="orders-q" grow>
          <Input id="orders-q" name="q" defaultValue={q} placeholder="שם ספק" />
        </CompactField>
      </FilterBar>
      {orders.length === 0 ? (
        <EmptyState
          title="אין הזמנות"
          description={month ? `אין הזמנות ב־${monthLabel(month)} לפי הסינון.` : "צרו הזמנה ראשונה מספק קיים."}
          action={{ href: "/orders/new", label: "התחלת הזמנה" }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>סניף</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>סכום</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>קליטה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const total = order.lines.reduce(
                (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
                0,
              );
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.supplier.name}
                    </Link>
                    <div className="mt-0.5">
                      <WhatsAppTicks orderId={order.id} status={order.whatsappStatus} compact canManage={false} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.branch.name}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>{formatIls(total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.receipt ? "נקלטה" : "טרם נקלטה"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
