import { decideOrderStandard } from "@/actions/inventory";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getAppSession();
  const { month: requested } = await searchParams;
  const month = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : monthKeyFromDate();
  const rows = await prisma.orderStandardSuggestion.findMany({
    where: {
      periodMonth: month,
      ...(session.isNetwork ? {} : { branchId: session.branchId ?? undefined }),
    },
    include: { branch: true, product: { include: { supplier: true } } },
    orderBy: [{ status: "asc" }, { product: { name: "asc" } }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="תקני הזמנה לאישור"
        description="ספירת תחילת חודש + הזמנות + ספירת סוף חודש מציעות תקן למוצר. העובד מאשר או דוחה. אין ML."
      />

      <form className="flex flex-wrap gap-2">
        <select name="month" defaultValue={month} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          {recentMonthKeys().map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          הצגה
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>פחת יומי / מכולת</CardTitle>
          <CardDescription>
            שאלות יומיות (מה נזרק היום, מה חסר במכולת) נרשמות בינתיים בדוח הפחת. חישוב התקן כאן משתמש בפחת ששויך למוצר בחודש.
          </CardDescription>
        </CardHeader>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          אין הצעות לחודש זה. סגרו ספירת «סוף חודש» אחרי ספירת תחילת חודש והזמנות.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} size="sm">
              <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <p className="font-medium">
                    {row.product.name} · {row.product.supplier.name}
                  </p>
                  <p className="text-muted-foreground">
                    {row.branch.name} · {statusLabel(row.status)} · התחלה {row.startQty} + הזמנות {row.orderedQty} − סוף{" "}
                    {row.endQty} = צריכה {row.consumptionQty}
                    {row.wasteQty ? ` · פחת ${row.wasteQty}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    תקן נוכחי {row.currentStandard} → מוצע {row.suggestedStandard}
                  </p>
                </div>
                {row.status === STANDARD_STATUS.PENDING ? (
                  <div className="flex gap-2">
                    <form action={decideOrderStandard.bind(null, row.id)}>
                      <input type="hidden" name="decision" value="approve" />
                      <Button type="submit" size="sm">
                        אישור תקן
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
