import { decideOrderStandard } from "@/actions/inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactPanel, FilterBar, NativeSelect } from "@/components/ui/compact-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STANDARD_STATUS } from "@/lib/constants";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  switch (status) {
    case STANDARD_STATUS.APPROVED:
      return "אושר";
    case STANDARD_STATUS.REJECTED:
      return "נדחה";
    default:
      return "ממתין לאישור";
  }
}

export default async function OrderStandardsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; branch?: string }>;
}) {
  const session = await getAppSession();
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKeyFromDate();
  const status = params.status?.trim() ?? "";
  const branchId = params.branch?.trim() ?? "";
  const rows = await prisma.orderStandardSuggestion.findMany({
    where: {
      periodMonth: month,
      ...(status ? { status } : {}),
      ...(session.isNetwork
        ? branchId
          ? { branchId }
          : {}
        : { branchId: session.branchId ?? undefined }),
    },
    include: { branch: true, product: { include: { supplier: true } } },
    orderBy: [{ status: "asc" }, { product: { name: "asc" } }],
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="תקני הזמנה לאישור"
        description="ספירת תחילת חודש + הזמנות + ספירת סוף חודש מציעות תקן למוצר. העובד מאשר או דוחה. אין ML."
      />

      <FilterBar submitLabel="הצגה">
        <CompactField label="חודש" htmlFor="std-month">
          <NativeSelect id="std-month" name="month" defaultValue={month}>
            {recentMonthKeys().map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </NativeSelect>
        </CompactField>
        <CompactField label="סטטוס" htmlFor="std-status">
          <NativeSelect id="std-status" name="status" defaultValue={status}>
            <option value="">הכל</option>
            <option value={STANDARD_STATUS.PENDING}>ממתין</option>
            <option value={STANDARD_STATUS.APPROVED}>אושר</option>
            <option value={STANDARD_STATUS.REJECTED}>נדחה</option>
          </NativeSelect>
        </CompactField>
        {session.isNetwork ? (
          <CompactField label="סניף" htmlFor="std-branch">
            <NativeSelect id="std-branch" name="branch" defaultValue={branchId}>
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

      <CompactPanel
        title="פחת יומי / מכולת"
        description="שאלות יומיות (מה נזרק היום, מה חסר במכולת) נרשמות בינתיים בדוח הפחת. חישוב התקן כאן משתמש בפחת ששויך למוצר בחודש."
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          אין הצעות לחודש זה. סגרו ספירת «סוף חודש» אחרי ספירת תחילת חודש והזמנות.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מוצר</TableHead>
              <TableHead>סניף</TableHead>
              <TableHead>חישוב</TableHead>
              <TableHead>תקן</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.product.name}</p>
                  <p className="text-xs text-muted-foreground">{row.product.supplier.name}</p>
                </TableCell>
                <TableCell>{row.branch.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  התחלה {row.startQty} + הזמנות {row.orderedQty} − סוף {row.endQty} = צריכה {row.consumptionQty}
                  {row.wasteQty ? ` · פחת ${row.wasteQty}` : ""}
                </TableCell>
                <TableCell>
                  {row.currentStandard} → {row.suggestedStandard}
                </TableCell>
                <TableCell>{statusLabel(row.status)}</TableCell>
                <TableCell className="text-end">
                  {row.status === STANDARD_STATUS.PENDING ? (
                    <div className="flex justify-end gap-1.5">
                      <form action={decideOrderStandard.bind(null, row.id)}>
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" size="sm">
                          אישור
                        </Button>
                      </form>
                      <form action={decideOrderStandard.bind(null, row.id)}>
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" size="sm" variant="outline">
                          דחייה
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
