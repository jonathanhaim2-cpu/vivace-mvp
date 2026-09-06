import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSupplier } from "@/actions/suppliers";
import { deleteProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  describePackaging,
  documentTypeLabel,
  formatDeliveryDays,
  formatIls,
  nextDeliveryInfo,
  parseDeliveryDays,
  suggestOrderQty,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { products: { orderBy: { name: "asc" } } },
  });
  if (!supplier) notFound();

  const days = parseDeliveryDays(supplier.deliveryDays);
  const windowInfo = nextDeliveryInfo(days, supplier.orderCutoffTime);

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`${documentTypeLabel(supplier.documentType)}${supplier.taxId ? ` · ח.פ. ${supplier.taxId}` : ""}`}
        action={{ href: `/orders/new?supplierId=${supplier.id}`, label: "הזמנה מספק זה" }}
      />

      <div className="flex flex-wrap gap-2">
        <Link href={`/suppliers/${supplier.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
          עריכת ספק
        </Link>
        <Link href={`/suppliers/${supplier.id}/products/new`} className={cn(buttonVariants({ variant: "outline" }))}>
          מוצר חדש
        </Link>
        <form action={deleteSupplier.bind(null, supplier.id)}>
          <Button type="submit" variant="destructive">
            מחיקת ספק
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי ספק</CardTitle>
          <CardDescription>{windowInfo.label}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>סוכן: {supplier.agentName || "—"} {supplier.agentPhone ? `· ${supplier.agentPhone}` : ""}</p>
          <p>וואטסאפ הזמנות: {supplier.whatsappPhone}</p>
          <p>נהג: {supplier.driverName || "—"}</p>
          <p>ימי אספקה: {formatDeliveryDays(supplier.deliveryDays) || "—"}</p>
          <p>סגירת הזמנה: {supplier.orderCutoffTime}</p>
          <p>תזכורת: {supplier.reminderHoursBefore} שעות לפני הסגירה (תצוגה ב-MVP)</p>
          <p>תקציב שבועי לסניף: {supplier.weeklyBudgetIls != null ? formatIls(supplier.weeklyBudgetIls) : "לא הוגדר"}</p>
          <p className="sm:col-span-2">{supplier.notes || "אין הערות"}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">מוצרים</h2>
        {supplier.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מוצרים. הוסיפו את המחירון המוסכם.</p>
        ) : (
          <div className="space-y-3">
            {supplier.products.map((product) => {
              const suggested = suggestOrderQty(product.stockStandard, days, supplier.orderCutoffTime);
              const pack = describePackaging(suggested, product.cartonToBags, product.bagsToUnits);
              return (
                <Card key={product.id} size="sm">
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku ? `${product.sku} · ` : ""}
                        {formatIls(product.agreedPrice)}
                        {product.discountPercent ? ` · הנחה ${product.discountPercent}%` : ""}
                        {product.vatIncluded ? " · כולל מע״מ" : " · לפני מע״מ"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        מלאי תקן {product.stockStandard} · הצעת הזמנה כעת {suggested}
                        {pack ? ` · ${pack}` : ""}
                      </p>
                      {product.packagingNotes ? (
                        <p className="text-xs text-muted-foreground">{product.packagingNotes}</p>
                      ) : null}
                      {product.documentType ? (
                        <p className="text-xs text-muted-foreground">מסמך: {documentTypeLabel(product.documentType)}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        עריכה
                      </Link>
                      <form action={deleteProduct.bind(null, product.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          מחיקה
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
