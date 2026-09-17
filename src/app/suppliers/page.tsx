import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ClockTime } from "@/components/clock-time";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listManagedSuppliers } from "@/lib/catalog";
import {
  documentTypeLabel,
  formatWeekdays,
  nextDeliveryInfo,
  nextOrderWindow,
  parseDeliveryDays,
  resolveOrderDays,
} from "@/lib/format";
import { getAppSession, sessionCan } from "@/lib/session";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string }>;
}) {
  const session = await getAppSession();
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

  return (
    <div>
      <PageHeader
        title="ספקים"
        description={
          session.isNetwork
            ? "כולל ספקים לא פעילים. זכיין רואה רק פעילים וזמינים לסניף."
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
              <TableHead>מסמך</TableHead>
              <TableHead>הזמנה</TableHead>
              <TableHead>מוצרים</TableHead>
              <TableHead>סטטוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => {
              const info = nextDeliveryInfo(
                parseDeliveryDays(supplier.deliveryDays),
                supplier.orderCutoffTime,
                resolveOrderDays(supplier.orderDays, supplier.deliveryDays),
              );
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
                    {supplier.taxId ? (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {supplier.taxId}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{documentTypeLabel(supplier.documentType)}</TableCell>
                  <TableCell className="text-xs">
                    <p>
                      {formatWeekdays(resolveOrderDays(supplier.orderDays, supplier.deliveryDays)) || "—"} · עד{" "}
                      <ClockTime value={supplier.orderCutoffTime} />
                    </p>
                    <p className="text-muted-foreground">{info.label}</p>
                    <NextOrderNotice info={nextOrder} className="text-xs" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{supplier._count.products}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.active ? "פעיל" : "לא פעיל"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
