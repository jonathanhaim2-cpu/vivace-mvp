import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { NextOrderNotice } from "@/components/orders/next-order-notice";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listManagedSuppliers } from "@/lib/catalog";
import { nextOrderWindow, resolveOrderDays } from "@/lib/format";
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
              <TableHead>הזמנה הבאה</TableHead>
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
                  <TableCell className="text-xs">
                    <NextOrderNotice info={nextOrder} className="text-xs" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
