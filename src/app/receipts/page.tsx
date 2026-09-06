import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export default async function ReceiptsPage() {
  const session = await getAppSession();
  const receipts = await prisma.goodsReceipt.findMany({
    where: session.isNetwork ? {} : { order: { branchId: session.branchId ?? undefined } },
    include: {
      order: { include: { supplier: true, branch: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="קליטת סחורה"
        description="השוואה מול הזמנה, סימון חוסרים וסטיות מחיר, ואישור משרד הרשת למחירון חדש."
      />
      {receipts.length === 0 ? (
        <EmptyState
          title="אין קליטות עדיין"
          description="פתחו הזמנה שנשלחה וקלטו מולה את הסחורה עם צילום חשבונית."
          action={{ href: "/orders", label: "אל ההזמנות" }}
        />
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
              <Card className="hover:bg-accent/30">
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{receipt.order.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.order.branch.name} · {formatDateTime(receipt.createdAt)} · {receipt.lines.length} שורות
                    </p>
                  </div>
                  <ReceiptStatusBadge status={receipt.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
