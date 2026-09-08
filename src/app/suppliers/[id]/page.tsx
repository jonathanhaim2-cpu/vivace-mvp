import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSupplier } from "@/actions/suppliers";
import { deleteProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductImportForm } from "@/components/products/product-import-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryPathLabel } from "@/lib/categories";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { PAYMENT_METHODS, PAYMENT_TERMS } from "@/lib/constants";
import {
  describePackaging,
  documentTypeLabel,
  formatDeliveryDays,
  formatIls,
  nextDeliveryInfo,
  parseDeliveryDays,
  suggestOrderQty,
} from "@/lib/format";
import { PLANTS_COUNCIL } from "@/lib/plants-council";
import { networkNetPrice, visiblePrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; imported?: string }>;
}) {
  const { id } = await params;
  const { category: categoryFilter, imported } = await searchParams;
  const session = await getAppSession();
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: { include: { category: { include: { parent: true } } }, orderBy: { name: "asc" } },
      defaultCategory: { include: { parent: true } },
      branchLinks: { include: { branch: true } },
      priceLists: true,
    },
  });
  if (!supplier) notFound();
  if (!session.isNetwork && !supplierVisibleToBranch(supplier, session.branchId)) notFound();

  const days = parseDeliveryDays(supplier.deliveryDays);
  const windowInfo = nextDeliveryInfo(days, supplier.orderCutoffTime);
  const terms = PAYMENT_TERMS.find((t) => t.value === supplier.paymentTerms)?.label;
  const method = PAYMENT_METHODS.find((t) => t.value === supplier.paymentMethod)?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`${documentTypeLabel(supplier.documentType)}${supplier.taxId ? ` · ח.פ. ${supplier.taxId}` : ""}${supplier.active ? "" : " · לא פעיל"}`}
        action={{ href: `/orders/new?supplierId=${supplier.id}`, label: "הזמנה מספק זה" }}
      />

      {imported ? (
        <p className="text-sm text-primary">יובאו / עודכנו {imported} מוצרים.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href={`/suppliers/${supplier.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
          עריכת ספק
        </Link>
        <Link href={`/suppliers/${supplier.id}/products/new`} className={cn(buttonVariants({ variant: "outline" }))}>
          מוצר חדש
        </Link>
        <Link href={`/suppliers/${supplier.id}/import`} className={cn(buttonVariants({ variant: "outline" }))}>
          ייבוא Excel
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
          <p>תקציב שבועי: {supplier.weeklyBudgetIls != null ? formatIls(supplier.weeklyBudgetIls) : "לא הוגדר"}</p>
          <p>קטגוריית ברירת מחדל: {categoryPathLabel(supplier.defaultCategory)}</p>
          <p>
            סניפים:{" "}
            {supplier.branchLinks.length === 0
              ? "כל הסניפים"
              : supplier.branchLinks.map((link) => link.branch.name).join(", ")}
          </p>
          <p>תנאי תשלום: {terms ?? "לא הוגדר"}</p>
          <p>אמצעי תשלום: {method ?? "לא הוגדר"}</p>
          <p>הנה״ח: {[supplier.accountingPhone, supplier.accountingEmail].filter(Boolean).join(" · ") || "—"}</p>
          <p>
            שותפות: {supplier.partnerName || "—"}
            {supplier.partnerPercent != null ? ` · ${supplier.partnerPercent}%` : ""}
          </p>
          {supplier.plantsCouncilUrl || supplier.plantsCouncilDiscountPct != null ? (
            <p className="sm:col-span-2">
              {PLANTS_COUNCIL.nameHe}:{" "}
              {supplier.plantsCouncilUrl ? (
                <a href={supplier.plantsCouncilUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  קישור ידני
                </a>
              ) : (
                "אין קישור"
              )}
              {supplier.plantsCouncilDiscountPct != null ? ` · ${supplier.plantsCouncilDiscountPct}% מתחת למחירון` : ""}
            </p>
          ) : null}
          <p className="sm:col-span-2">{supplier.notes || "אין הערות"}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-1 font-heading text-lg font-semibold">מוצרים תחת {supplier.name}</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          מחירון זכיין בלבד בסניף. משרד הרשת רואה גם ריבייט/פלוס.
        </p>
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
          <p className="text-sm text-muted-foreground">אין מוצרים. הוסיפו ידנית או ייבאו Excel.</p>
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
                const price = visiblePrice(product);
                const hqNet = networkNetPrice(product);
                return (
                  <Card key={product.id} size="sm">
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku ? `${product.sku} · ` : ""}
                          {categoryPathLabel(product.category)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          לפני מע״מ {formatIls(price.beforeVat)} · הנחה {price.discountPercent}% · אחרי{" "}
                          {formatIls(price.afterDiscount)}
                          {price.cartonPrice
                            ? ` · קרטון ${formatIls(price.cartonPrice)} (${formatIls(price.afterDiscount)} × ${price.packUnits})`
                            : ""}
                        </p>
                        {session.isNetwork && (product.networkRebatePercent || product.networkPlusPercent) ? (
                          <p className="text-xs text-muted-foreground">
                            רשת בלבד: ריבייט {product.networkRebatePercent}% · פלוס {product.networkPlusPercent}% · נטו{" "}
                            {formatIls(hqNet)}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          מלאי תקן {product.stockStandard} · הצעת הזמנה {suggested}
                          {pack ? ` · ${pack}` : ""}
                        </p>
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

      <Card>
        <CardHeader>
          <CardTitle>ייבוא מהיר</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductImportForm supplierId={supplier.id} />
        </CardContent>
      </Card>
    </div>
  );
}
