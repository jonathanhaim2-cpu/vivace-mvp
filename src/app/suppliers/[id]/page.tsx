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
import { categoryPathLabel } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category: categoryFilter } = await searchParams;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: { include: { category: { include: { parent: true } } }, orderBy: { name: "asc" } },
      defaultCategory: { include: { parent: true } },
    },
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
        <Link href="/categories" className={cn(buttonVariants({ variant: "ghost" }))}>
          קטגוריות
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
          <p>קטגוריית ברירת מחדל: {categoryPathLabel(supplier.defaultCategory)}</p>
          <p className="sm:col-span-2">{supplier.notes || "אין הערות"}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold">מוצרים</h2>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <Link
            href={`/suppliers/${supplier.id}`}
            className={cn("rounded-full border px-2.5 py-1", !categoryFilter && "border-primary bg-primary/10")}
          >
            הכל
          </Link>
          {Array.from(
            new Map(
              supplier.products
                .map((p) => p.category?.parent ?? p.category)
                .filter(Boolean)
                .map((c) => [c!.id, c!]),
            ).values(),
          ).map((cat) => (
            <Link
              key={cat.id}
              href={`/suppliers/${supplier.id}?category=${cat.id}`}
              className={cn(
                "rounded-full border px-2.5 py-1",
                categoryFilter === cat.id && "border-primary bg-primary/10",
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
        {supplier.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מוצרים. הוסיפו את המחירון המוסכם.</p>
        ) : (
          <div className="space-y-3">
            {supplier.products
              .filter((product) => {
                if (!categoryFilter) return true;
                return product.categoryId === categoryFilter || product.category?.parentId === categoryFilter;
              })
              .map((product) => {
              const suggested = suggestOrderQty(product.stockStandard, days, supplier.orderCutoffTime);
              const pack = describePackaging(suggested, product.cartonToBags, product.bagsToUnits);
              return (
                <Card key={product.id} size="sm">
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku ? `${product.sku} · ` : ""}
                        {categoryPathLabel(product.category)} · {formatIls(product.agreedPrice)}
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
