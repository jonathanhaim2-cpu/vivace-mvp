import Link from "next/link";
import { OrderWizard } from "@/components/orders/order-wizard";
import { SupplierPickGrid } from "@/components/orders/supplier-pick-grid";
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
  searchParams: Promise<{ supplierId?: string; branch?: string; q?: string; tab?: string }>;
}) {
  const { supplierId, branch: requestedBranch, q, tab } = await searchParams;
  const [session, sendToSuppliers] = await Promise.all([getAppSession(), getSendToSuppliersEnabled()]);
  const activeBranch = requestedBranch
    ? session.branches.find((item) => item.id === requestedBranch) ?? null
    : session.branch;
  if (!activeBranch) {
    if (session.isNetwork && session.branches.length > 0) {
      return (
        <div>
          <PageHeader
            title="הזמנה חדשה"
            description="משרד הרשת בוחר סניף לפני הזמנה. ההזמנה נרשמת על הסניף שנבחר, לא על בית שמש כברירת מחדל."
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {session.branches.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/orders/new?branch=${item.id}`}
                  className="block rounded-2xl border bg-card px-4 py-3 font-medium shadow-[var(--shadow-card)]"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <EmptyState
        title="אין סניף פעיל"
        description="צריך סניף כדי להזמין. הוסיפו סניף בהגדרות ואז חזרו להזמנה."
        action={{ href: "/settings", label: "הוספת סניף" }}
      />
    );
  }

  const suppliers = (await listOrderableSuppliers({ role: session.role, branchId: activeBranch.id })).map(
    (supplier) => {
      const resolved = resolveSupplierForBranch(supplier, activeBranch.id);
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
            branchId: activeBranch.id,
            createdAt: { gte: weekStart },
          },
        },
      })
    : [];
  const weeklySpent = weeklyLines.reduce(
    (sum, line) => sum + lineTotal(line.qty, line.unitPrice, line.discountPercent),
    0,
  );
  const openOrders = await prisma.order.findMany({
    where: {
      branchId: activeBranch.id,
      status: { in: ["CONFIRMED", "SENT"] },
      receipt: null,
    },
    select: { supplierId: true },
  });
  const openOrder = allowedSupplier
    ? await prisma.order.findFirst({
        where: {
          supplierId: allowedSupplier,
          branchId: activeBranch.id,
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
        description={`הזמנה לסניף ${activeBranch.name}. בחירת ספק, כמויות, ואישור לפני וואטסאפ.`}
      />
      <div className={allowedSupplier ? "hidden" : undefined}>
      <SupplierPickGrid
        branchId={activeBranch.id}
        suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
        openSupplierIds={[...new Set(openOrders.map((order) => order.supplierId))]}
        query={q ?? ""}
        tab={tab ?? ""}
      />
      </div>
      {allowedSupplier ? (
        <p className="mb-3 lg:hidden">
          <Link href={`/orders/new?branch=${activeBranch.id}`} className="text-sm text-primary hover:underline">
            בחירת ספק אחר
          </Link>
        </p>
      ) : null}
      <div className={allowedSupplier ? "" : "hidden lg:block"}>
      <OrderWizard
        suppliers={suppliers}
        products={products}
        selectedSupplierId={allowedSupplier}
        branchId={activeBranch.id}
        branchName={activeBranch.name}
        branch={{
          name: activeBranch.name,
          address: activeBranch.address,
          phone: activeBranch.phone,
          contactName: activeBranch.contactName,
        }}
        weeklySpent={weeklySpent}
        sendToSuppliers={sendToSuppliers}
        openOrder={
          openOrder
            ? { id: openOrder.id, status: openOrder.status, lineCount: openOrder._count.lines }
            : null
        }
      />
      </div>
    </div>
  );
}
