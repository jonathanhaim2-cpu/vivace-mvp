import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { CompactField, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { monthLabel, monthRangeUtc, parseMonthParam, recentMonthKeys } from "@/lib/months";
import { inventoryKindLabel } from "@/lib/order-standards";
import { INVENTORY_KIND } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; kind?: string; status?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const kind = params.kind?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const branchId = params.branch?.trim() ?? "";
  const range = month ? monthRangeUtc(month) : null;

  const counts = await prisma.inventoryCount.findMany({
    where: {
      ...(session.isNetwork
        ? branchId
          ? { branchId }
          : {}
        : { branchId: session.branchId ?? undefined }),
      ...(range ? { countedOn: { gte: range.start, lt: range.end } } : {}),
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
    },
    include: { branch: true, _count: { select: { lines: true } } },
    orderBy: { countedOn: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="מלאי · ספירות"
        description="ספירת מלאי לפי סניף. שומרים כמות שנספרה לכל מוצר, עם תאריך. פחת בנפרד."
        action={{ href: "/inventory/new", label: "ספירה חדשה" }}
      />
      <p className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link href="/inventory/standards" className={cn(buttonVariants({ variant: "outline" }))}>
          אישור תקני הזמנה
        </Link>
        <Link href="/waste" className={cn(buttonVariants({ variant: "ghost" }))}>
          דוח פחת
        </Link>
      </p>
      <FilterBar>
        <CompactField label="חודש" htmlFor="inv-month">
          <NativeSelect id="inv-month" name="month" defaultValue={month ?? "all"}>
            <option value="all">כל החודשים</option>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="סוג" htmlFor="inv-kind">
          <NativeSelect id="inv-kind" name="kind" defaultValue={kind}>
            <option value="">הכל</option>
            <option value={INVENTORY_KIND.START}>תחילת חודש</option>
            <option value={INVENTORY_KIND.END}>סוף חודש</option>
            <option value={INVENTORY_KIND.SPOT}>נקודתית</option>
          </NativeSelect>
        </CompactField>
        <CompactField label="סטטוס" htmlFor="inv-status">
          <NativeSelect id="inv-status" name="status" defaultValue={status}>
            <option value="">הכל</option>
            <option value="OPEN">פתוחה</option>
            <option value="CLOSED">נסגרה</option>
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="inv-branch">
            <NativeSelect id="inv-branch" name="branch" defaultValue={branchId}>
              <option value="">כל הסניפים</option>
              {session.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </CompactField>
        ) : null}
      </FilterBar>
      {counts.length === 0 ? (
        <EmptyState
          title="אין ספירות"
          description="פתחו ספירה לסניף והזינו כמויות."
          action={{ href: "/inventory/new", label: "התחלת ספירה" }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>סניף</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>פריטים</TableHead>
              <TableHead>סטטוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts.map((count) => (
              <TableRow key={count.id}>
                <TableCell>
                  <Link href={`/inventory/${count.id}`} className="font-medium hover:underline">
                    {count.branch.name}
                  </Link>
                  {count.notes ? <p className="text-xs text-muted-foreground">{count.notes}</p> : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(count.countedOn)}</TableCell>
                <TableCell>
                  {inventoryKindLabel(count.kind)}
                  {count.periodMonth ? ` · ${count.periodMonth}` : ""}
                </TableCell>
                <TableCell>{count._count.lines}</TableCell>
                <TableCell className="text-muted-foreground">{count.status === "OPEN" ? "פתוחה" : "נסגרה"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
