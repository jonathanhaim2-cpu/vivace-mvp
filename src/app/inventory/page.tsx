import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { inventoryKindLabel } from "@/lib/order-standards";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function InventoryPage() {
  const session = await getAppSession();
  const counts = await prisma.inventoryCount.findMany({
    where: session.isNetwork ? {} : { branchId: session.branchId ?? undefined },
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
      <p className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/inventory/standards" className={cn(buttonVariants({ variant: "outline" }))}>
          אישור תקני הזמנה
        </Link>
        <Link href="/waste" className={cn(buttonVariants({ variant: "ghost" }))}>
          דוח פחת
        </Link>
      </p>
      <Card className="mb-4">
        <CardContent className="py-3 text-sm text-muted-foreground">
          רכש חכם v1: ספירת תחילת חודש → הזמנות בחודש → ספירת סוף חודש → הצעת תקן למוצר לאישור עובד.
          שאלות פחת יומי / מכולת נרשמות בדוח הפחת (אין מודל ML בשלב זה).
        </CardContent>
      </Card>
      {counts.length === 0 ? (
        <EmptyState
          title="אין ספירות"
          description="פתחו ספירה לסניף והזינו כמויות."
          action={{ href: "/inventory/new", label: "התחלת ספירה" }}
        />
      ) : (
        <div className="space-y-3">
          {counts.map((count) => (
            <Link key={count.id} href={`/inventory/${count.id}`}>
              <Card className="hover:bg-accent/30">
                <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{count.branch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(count.countedOn)} · {inventoryKindLabel(count.kind)}
                      {count.periodMonth ? ` · ${count.periodMonth}` : ""} · {count._count.lines} פריטים
                      {count.notes ? ` · ${count.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {count.status === "OPEN" ? "פתוחה" : "נסגרה"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
