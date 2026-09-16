import { OrderWizard } from "@/components/orders/order-wizard";
import { EmptyState, PageHeader } from "@/components/page-header";
import { listOrderableSuppliers } from "@/lib/catalog";
import { lineTotal, startOfIsraelWeek } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { resolveSupplierForBranch } from "@/lib/supplier-branch";
import { getSendToSuppliersEnabled, resolveOrderWhatsAppPhone } from "@/lib/whatsapp-routing";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const { supplierId } = await searchParams;
  const [session, sendToSuppliers] = await Promise.all([getAppSession(), getSendToSuppliersEnabled()]);
  if (!session.branchId) {
    return (
      <EmptyState
        title="אין סניף פעיל"
        description="צריך סניף כדי להזמין. הוסיפו סניף בהגדרות ואז חזרו להזמנה."
        action={{ href: "/settings", label: "הוספת סניף" }}
      />
    );
  }

  const suppliers = (await listOrderableSuppliers({ role: session.role, branchId: session.branchId })).map(
    (supplier) => {
      const resolved = resolveSupplierForBranch(supplier, session.branchId);
      return {
        ...resolved,
        catalogPhone: resolved.whatsappPhone,
        whatsappPhone: resolveOrderWhatsAppPhone({
          sendToSuppliers,
          supplierPhone: resolved.whatsappPhone,
        }),
      };
    },
  );
  const allowedSupplier = supplierId && suppliers.some((item) => item.id === supplierId) ? supplierId : undefined;
  const productsRaw = allowedSupplier
    ? await prisma.product.findMany({
        where: { supplierId },
        include: { priceListItems: { include: { priceList: true } } },
        orderBy: { name: "asc" },
      })
    : [];
  const products = productsRaw.map((product) => {
    const franchisee = product.priceListItems.find((item) => item.priceList.kind === "FRANCHISEE");
    return {
      ...product,
      agreedPrice: franchisee?.unitPrice ?? product.agreedPrice,
      discountPercent: franchisee?.discountPercent ?? product.discountPercent,
    };
  });

  const weekStart = startOfIsraelWeek();
  const weeklyLines = allowedSupplier
    ? await prisma.orderLine.findMany({
        where: {
          order: {
            supplierId: allowedSupplier,
            branchId: session.branchId,
            createdAt: { gte: weekStart },
          },
        },
      })
    : [];
  const weeklySpent = weeklyLines.reduce(
    (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
    0,
  );
  const openOrder = allowedSupplier
    ? await prisma.order.findFirst({
        where: {
          supplierId: allowedSupplier,
          branchId: session.branchId,
          status: { in: ["CONFIRMED", "SENT"] },
          receipt: null,
        },
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div>
      <PageHeader
        title="הזמנה חדשה"
        description={`מנהל ${session.branch?.name ?? "הסניף"} בוחר ספק, כמויות, ומאשר סיכום לפני וואטסאפ.`}
      />
      <OrderWizard
        suppliers={suppliers}
        products={products}
        selectedSupplierId={allowedSupplier}
        branchId={session.branchId}
        branchName={session.branch?.name ?? "סניף"}
        branch={
          session.branch
            ? {
                name: session.branch.name,
                address: session.branch.address,
                phone: session.branch.phone,
                contactName: session.branch.contactName,
              }
            : null
        }
        weeklySpent={weeklySpent}
        sendToSuppliers={sendToSuppliers}
        openOrder={
          openOrder
            ? { id: openOrder.id, status: openOrder.status, lineCount: openOrder._count.lines }
            : null
        }
      />
    </div>
  );
}
