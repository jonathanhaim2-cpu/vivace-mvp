import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSupplier } from "@/actions/suppliers";
import { deleteProduct } from "@/actions/products";
import { PageHeader } from "@/components/page-header";
import { ProductImportForm } from "@/components/products/product-import-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { ClockTime } from "@/components/clock-time";
import { categoryPathLabel } from "@/lib/categories";
import { supplierVisibleToBranch } from "@/lib/catalog";
import { PAYMENT_METHODS, PAYMENT_TERMS } from "@/lib/constants";
import {
  describePackaging,
  documentTypeLabel,
  formatDeliveryDays,
  formatIls,
  formatWeekdays,
  nextDeliveryInfo,
  nextOrderWindow,
  parseDeliveryDays,
  resolveOrderDays,
  suggestOrderQty,
} from "@/lib/format";
import { isPlantsCouncilRelevant, PLANTS_COUNCIL } from "@/lib/plants-council";
import { networkNetPrice, visiblePrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getAppSession, sessionCan } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; imported?: string; q?: string }>;
}) {
  const { id } = await params;
  const { category: categoryFilter, imported, q } = await searchParams;
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

  const parentCategories = Array.from(
    new Map(
      supplier.products
        .map((p) => p.category?.parent ?? p.category)
        .filter(Boolean)
        .map((c) => [c!.id, c!]),
    ).values(),
  );
  const listedProducts = supplier.products.filter((product) => {
    if (categoryFilter && product.categoryId !== categoryFilter && product.category?.parentId !== categoryFilter) {
      return false;
    }
    if (q && !`${product.name} ${product.sku ?? ""}`.includes(q)) return false;
    return true;
  });
  const days = parseDeliveryDays(supplier.deliveryDays);
  const orderDays = resolveOrderDays(supplier.orderDays, supplier.deliveryDays);
  const windowInfo = nextDeliveryInfo(days, supplier.orderCutoffTime, orderDays);
  const nextOrder = nextOrderWindow(orderDays, supplier.orderCutoffTime, supplier.reminderHoursBefore);
  const terms = PAYMENT_TERMS.find((t) => t.value === supplier.paymentTerms)?.label;
  const method = PAYMENT_METHODS.find((t) => t.value === supplier.paymentMethod)?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={`${documentTypeLabel(supplier.documentType)}${supplier.taxId ? ` · ח.פ. ${supplier.taxId}` : ""}${supplier.active ? "" : " · לא פעיל"}`}
        action={
          sessionCan(session, "action.create_orders")
            ? { href: `/orders/new?supplierId=${supplier.id}`, label: "הזמנה מספק זה" }
            : undefined
        }
      />

      {imported ? (
        <p className="text-sm text-primary">יובאו / עודכנו {imported} מוצרים.</p>
      ) : null}

      {(sessionCan(session, "action.edit_suppliers") || sessionCan(session, "action.edit_prices")) ? (
      <div className="flex flex-wrap gap-2">
        {sessionCan(session, "action.edit_suppliers") ? (
          <>
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
          </>
        ) : null}
      </div>
      ) : null}

      <CompactPanel title="פרטי ספק" description={windowInfo.label}>
        <div className="grid gap-1.5 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <NextOrderNotice info={nextOrder} />
          </div>
          <p>סוכן: {supplier.agentName || "—"} {supplier.agentPhone ? `· ${supplier.agentPhone}` : ""}</p>
          <p>וואטסאפ הזמנות: {supplier.whatsappPhone}</p>
          {supplier.branchLinks.some((link) => link.whatsappPhone) ? (
            <p className="sm:col-span-2 text-muted-foreground">
              לפי סניף:{" "}
              {supplier.branchLinks
                .filter((link) => link.whatsappPhone)
                .map((link) => `${link.branch.name} ${link.whatsappPhone}`)
                .join(" · ")}
            </p>
          ) : null}
          <p>מפיץ: {supplier.driverName || "—"}</p>
          <p>כתובת: {supplier.address || "—"}</p>
          <p>נקודת חלוקה: {supplier.deliveryPointNumber || "—"}</p>
          <p>ימי אספקה: {formatDeliveryDays(supplier.deliveryDays) || "—"}</p>
          <p>ימי הזמנה: {formatWeekdays(orderDays) || "—"}</p>
          <p>
            סגירת הזמנה: <ClockTime value={supplier.orderCutoffTime} />
          </p>
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
          {supplier.plantsCouncilRelevant ? (
            <p className="sm:col-span-2">
              {PLANTS_COUNCIL.nameHe}: רלוונטי
              {supplier.plantsCouncilUrl ? (
                <>
                  {" · "}
                  <a href={supplier.plantsCouncilUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    קישור ידני
                  </a>
                </>
              ) : (
                " · אין קישור"
              )}
              {supplier.plantsCouncilDiscountPct != null ? ` · ${supplier.plantsCouncilDiscountPct}% מתחת למחירון` : ""}
            </p>
          ) : null}
          <p className="sm:col-span-2">{supplier.notes || "אין הערות"}</p>
        </div>
      </CompactPanel>

      <div>
        <h2 className="mb-1 font-heading text-lg font-semibold">מוצרים תחת {supplier.name}</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          מחירון זכיין בלבד בסניף. משרד הרשת רואה גם ריבייט/פלוס.
        </p>
        <FilterBar>
          <CompactField label="קטגוריה" htmlFor="sup-cat">
            <NativeSelect id="sup-cat" name="category" defaultValue={categoryFilter ?? ""}>
              <option value="">הכל</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
          <CompactField label="חיפוש" htmlFor="sup-prod-q" grow>
            <Input id="sup-prod-q" name="q" defaultValue={q ?? ""} placeholder="שם או מק״ט" />
          </CompactField>
        </FilterBar>
        {listedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {supplier.products.length === 0 ? "אין מוצרים. הוסיפו ידנית או ייבאו Excel." : "אין מוצרים שתואמים לסינון."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>מוצר</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>תקן</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listedProducts.map((product) => {
                const suggested = suggestOrderQty(product.stockStandard, days, supplier.orderCutoffTime);
                const pack = describePackaging(suggested, product.cartonToBags, product.bagsToUnits);
                const price = visiblePrice(product);
                const hqNet = networkNetPrice(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku ? `${product.sku} · ` : ""}
                        {categoryPathLabel(product.category)}
                        {isPlantsCouncilRelevant(supplier, product) ? ` · ${PLANTS_COUNCIL.nameHe}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>
                        לפני מע״מ {formatIls(price.beforeVat)} · הנחה {price.discountPercent}% · אחרי{" "}
                        {formatIls(price.afterDiscount)}
                      </p>
                      {price.cartonPrice ? (
                        <p className="text-muted-foreground">
                          קרטון {formatIls(price.cartonPrice)} ({formatIls(price.afterDiscount)} × {price.packUnits})
                        </p>
                      ) : null}
                      {session.isNetwork && (product.networkRebatePercent || product.networkPlusPercent) ? (
                        <p className="text-muted-foreground">
                          רשת: ריבייט {product.networkRebatePercent}% · פלוס {product.networkPlusPercent}% · נטו{" "}
                          {formatIls(hqNet)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.stockStandard} · הצעה {suggested}
                      {pack ? ` · ${pack}` : ""}
                    </TableCell>
                    <TableCell className="text-end">
                      {sessionCan(session, "action.edit_prices") || sessionCan(session, "action.edit_suppliers") ? (
                        <div className="flex justify-end gap-1.5">
                          {sessionCan(session, "action.edit_prices") ? (
                            <Link
                              href={`/products/${product.id}/edit`}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              עריכה
                            </Link>
                          ) : null}
                          {sessionCan(session, "action.edit_suppliers") ? (
                            <form action={deleteProduct.bind(null, product.id)}>
                              <Button type="submit" size="sm" variant="ghost">
                                מחיקה
                              </Button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {sessionCan(session, "action.edit_suppliers") ? (
        <CompactPanel title="ייבוא מהיר">
          <ProductImportForm supplierId={supplier.id} />
        </CompactPanel>
      ) : null}
    </div>
  );
}
