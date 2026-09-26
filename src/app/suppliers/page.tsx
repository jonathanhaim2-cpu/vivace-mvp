import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { AnnualTargetCell } from "@/components/suppliers/annual-target-cell";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listManagedSuppliers } from "@/lib/catalog";
import { formatIls, nextOrderWindow, nowInIsrael, resolveOrderDays } from "@/lib/format";
import { signedDocumentAmount } from "@/lib/money";
import { pnlMonthKey } from "@/lib/pnl-month";
import { prisma } from "@/lib/prisma";
import { getAppSession, sessionCan } from "@/lib/session";
import { networkRevenueSharePercent, ytdPurchaseStats } from "@/lib/supplier-purchases";
import { backfillSupplierOrderableOnce } from "@/lib/supplier-orderable";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string }>;
}) {
  const session = await getAppSession();
  await backfillSupplierOrderableOnce();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const active = params.active?.trim() || "active";
  const suppliers = (await listManagedSuppliers({ role: session.role, branchId: session.branchId })).filter(
    (supplier) => {
      if (q && !`${supplier.name} ${supplier.taxId ?? ""}`.includes(q)) return false;
      if (active === "active" && !supplier.active) return false;
      if (active === "inactive" && supplier.active) return false;
      return true;
    },
  );
  const office = session.isNetworkOffice;
  const clock = nowInIsrael();
  const purchaseBySupplier = new Map<string, { ytd: number; average: number; share: number | null }>();
  if (office && suppliers.length > 0) {
    const photos = await prisma.invoicePhoto.findMany({
      where: { isDuplicate: false, approvalStatus: "APPROVED" },
      select: {
        amountIls: true,
        aiTotalIls: true,
        documentType: true,
        aiInvoiceDate: true,
        aiSupplierName: true,
        createdAt: true,
        goodsReceipt: { select: { order: { select: { supplierId: true } } } },
      },
    });
    const buckets = new Map<string, Record<string, number>>();
    for (const photo of photos) {
      const month = pnlMonthKey({ invoiceDate: photo.aiInvoiceDate, createdAt: photo.createdAt });
      if (!month?.startsWith(`${clock.year}-`)) continue;
      const named = photo.aiSupplierName?.trim().toLocaleLowerCase("he");
      const supplierId =
        photo.goodsReceipt?.order.supplierId ??
        suppliers.find((supplier) => supplier.name.trim().toLocaleLowerCase("he") === named)?.id;
      if (!supplierId) continue;
      const bucket = buckets.get(supplierId) ?? {};
      bucket[month] = (bucket[month] ?? 0) + signedDocumentAmount(photo);
      buckets.set(supplierId, bucket);
    }
    for (const supplier of suppliers) {
      const stats = ytdPurchaseStats(buckets.get(supplier.id) ?? {}, clock.year, clock.month);
      purchaseBySupplier.set(supplier.id, {
        ...stats,
        share: networkRevenueSharePercent(stats.average, null),
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="ספקים"
        description={
          session.isNetwork
            ? "רשימה קצרה. פירוט מלא בכרטיס הספק. בית שמש וקריית יערים מופרדים."
            : "ספקים פעילים שזמינים לסניף זה."
        }
        action={
          sessionCan(session, "action.edit_suppliers")
            ? { href: "/suppliers/new", label: "ספק חדש" }
            : undefined
        }
      />
      <FilterBar>
        <CompactField label="חיפוש" htmlFor="sup-q" grow>
          <Input id="sup-q" name="q" defaultValue={q} placeholder="שם או ח.פ." />
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סטטוס" htmlFor="sup-active">
            <NativeSelect id="sup-active" name="active" defaultValue={active}>
              <option value="all">הכל</option>
              <option value="active">פעיל</option>
              <option value="inactive">לא פעיל</option>
            </NativeSelect>
          </CompactField>
        ) : null}
      </FilterBar>
      {sessionCan(session, "action.manage_settings") ? (
        <p className="mb-3 text-sm">
          <Link href="/categories" className="text-primary hover:underline">
            ניהול קטגוריות ותתי־קטגוריות
          </Link>
        </p>
      ) : null}
      {suppliers.length === 0 ? (
        <EmptyState
          title="אין ספקים"
          description="הוסיפו ספק ראשון כדי להתחיל להזמין."
          action={
            sessionCan(session, "action.edit_suppliers")
              ? { href: "/suppliers/new", label: "יצירת ספק" }
              : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ספק</TableHead>
              <TableHead>סניפים</TableHead>
              {office ? <TableHead>ממוצע חודשי</TableHead> : null}
              {office ? <TableHead>רכש מתחילת השנה</TableHead> : null}
              {office ? <TableHead>אחוז מהמחזור</TableHead> : null}
              {office ? <TableHead>יעד שנתי</TableHead> : null}
              {office ? null : <TableHead>הזמנה הבאה</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => {
              const nextOrder = nextOrderWindow(
                resolveOrderDays(supplier.orderDays, supplier.deliveryDays),
                supplier.orderCutoffTime,
                supplier.reminderHoursBefore,
              );
              return (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link href={`/suppliers/${supplier.id}`} className="font-medium hover:underline">
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {supplier.branchLinks.length === 0
                      ? "לא שויך"
                      : supplier.branchLinks.map((link) => link.branch?.name ?? link.branchId).join(" · ")}
                  </TableCell>
                  {office ? (
                    <>
                      <TableCell>{formatIls(purchaseBySupplier.get(supplier.id)?.average ?? 0)}</TableCell>
                      <TableCell>{formatIls(purchaseBySupplier.get(supplier.id)?.ytd ?? 0)}</TableCell>
                      <TableCell>
                        <span title="אין נתוני מחזור או מכירות במערכת, לכן אי אפשר לחשב אחוז מהמחזור.">—</span>
                      </TableCell>
                      <TableCell>
                        {sessionCan(session, "action.edit_suppliers") ? (
                          <AnnualTargetCell supplierId={supplier.id} value={supplier.annualPurchaseTargetIls} />
                        ) : (
                          supplier.annualPurchaseTargetIls != null ? formatIls(supplier.annualPurchaseTargetIls) : "—"
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="text-xs">
                      <NextOrderNotice info={nextOrder} className="text-xs" />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
