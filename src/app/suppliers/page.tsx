import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listManagedSuppliers } from "@/lib/catalog";
import { PAYMENT_METHODS, PAYMENT_TERMS } from "@/lib/constants";
import { documentTypeLabel, formatDeliveryDays, nextDeliveryInfo, parseDeliveryDays } from "@/lib/format";
import { getAppSession } from "@/lib/session";

export default async function SuppliersPage() {
  const session = await getAppSession();
  const suppliers = await listManagedSuppliers({ role: session.role, branchId: session.branchId });

  return (
    <div>
      <PageHeader
        title="ספקים"
        description={
          session.isNetwork
            ? "כולל ספקים לא פעילים. זכיין רואה רק פעילים וזמינים לסניף."
            : "ספקים פעילים שזמינים לסניף זה."
        }
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
            const terms = PAYMENT_TERMS.find((t) => t.value === supplier.paymentTerms)?.label;
            const method = PAYMENT_METHODS.find((t) => t.value === supplier.paymentMethod)?.label;
            return (
              <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
                <Card className="h-full hover:bg-accent/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{supplier.name}</span>
                      {!supplier.active ? (
                        <span className="text-xs font-normal text-muted-foreground">לא פעיל</span>
                      ) : null}
                    </CardTitle>
                    <CardDescription>
                      {documentTypeLabel(supplier.documentType)}
                      {supplier.taxId ? ` · ח.פ. ${supplier.taxId}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>{formatDeliveryDays(supplier.deliveryDays) || "לא הוגדרו ימי אספקה"}</p>
                    <p className="text-muted-foreground">{info.label}</p>
                    <p className="text-muted-foreground">
                      {supplier._count.products} מוצרים · {supplier._count.orders} הזמנות
                    </p>
                    {terms || method ? (
                      <p className="text-muted-foreground">
                        {[terms, method].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
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
