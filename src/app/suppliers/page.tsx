import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { documentTypeLabel, formatDeliveryDays, nextDeliveryInfo, parseDeliveryDays } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { products: true, orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="ספקים"
        description="פרטי חברה, סוכן, וואטסאפ, נהג וימי אספקה."
        action={{ href: "/suppliers/new", label: "ספק חדש" }}
      />
      <p className="mb-4 text-sm">
        <Link href="/categories" className="text-primary hover:underline">
          ניהול קטגוריות ותתי־קטגוריות
        </Link>
      </p>
      {suppliers.length === 0 ? (
        <EmptyState
          title="אין ספקים"
          description="הוסיפו ספק ראשון כדי להתחיל להזמין."
          action={{ href: "/suppliers/new", label: "יצירת ספק" }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {suppliers.map((supplier) => {
            const info = nextDeliveryInfo(parseDeliveryDays(supplier.deliveryDays), supplier.orderCutoffTime);
            return (
              <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
                <Card className="h-full hover:bg-accent/30">
                  <CardHeader>
                    <CardTitle>{supplier.name}</CardTitle>
                    <CardDescription>
                      {documentTypeLabel(supplier.documentType)}
                      {supplier.taxId ? ` · ח.פ. ${supplier.taxId}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>{formatDeliveryDays(supplier.deliveryDays) || "לא הוגדרו ימי אספקה"}</p>
                    <p className="text-muted-foreground">{info.label}</p>
                    <p className="text-muted-foreground">
                      {supplier._count.products} מוצרים · {supplier._count.orders} הזמנות · וואטסאפ {supplier.whatsappPhone}
                    </p>
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
