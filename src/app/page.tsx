import Link from "next/link";
import { saveDashboardSettings } from "@/actions/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY } from "@/lib/constants";
import {
  getAnomalies,
  getCategoryFill,
  getForecastTurnover,
  getGoodsToReceiveToday,
  getOrdersToPlaceToday,
  getRogueBranches,
} from "@/lib/dashboard";
import { getOverdueAccountantItems } from "@/lib/ap";
import { formatIls, lineTotal } from "@/lib/format";
import { monthKeyFromDate, monthLabel } from "@/lib/months";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getAppSession();
  const branchId = session.isNetwork ? null : session.branchId;
  const month = monthKeyFromDate();
  const forecast = await getForecastTurnover();
  const [fill, anomalies, toReceive, toOrder, overdue, rogue] = await Promise.all([
    getCategoryFill(month, forecast, branchId),
    getAnomalies(branchId),
    getGoodsToReceiveToday(branchId),
    getOrdersToPlaceToday(branchId, session.isNetwork),
    getOverdueAccountantItems(month),
    session.isNetwork ? getRogueBranches(month, forecast) : Promise.resolve({ threshold: 2, branches: [] as { id: string; name: string; reasons: string[] }[] }),
  ]);

  const anomalyCount =
    anomalies.pricePending.length + anomalies.missing.length + (anomalies.unclassified > 0 ? 1 : 0);
  const overCount = fill.filter((row) => row.over).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {COMPANY.nameHe} · {COMPANY.tagline}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
          {session.isNetwork ? "משרד הרשת" : session.branch?.name ?? "סניף"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{monthLabel(month)}</p>
      </div>

      {overdue.length > 0 ? (
        <Link
          href="/ap"
          className="block rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {overdue.length} הוצאות לא מרכש בלי סימון שולם/נשלח להנה״ח (אחרי ה-10 לחודש)
        </Link>
      ) : null}

      {session.isNetwork && rogue.branches.length > 0 ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">סניפים סוררים (חריגת יעד ≥ {rogue.threshold} נקודות אחוז)</p>
          <ul className="mt-1 space-y-1">
            {rogue.branches.map((branch) => (
              <li key={branch.id}>
                <span className="font-medium">{branch.name}</span>
                {" · "}
                {branch.reasons.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={overCount > 0 ? "ring-1 ring-destructive/40" : undefined}>
          <CardHeader>
            <CardTitle>מחזור חזוי מול רכש</CardTitle>
            <CardDescription>
              מילוי קטגוריה מול יעד % מהמחזור. אדום = מעל היעד. מחזור {formatIls(forecast)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {fill.map((row) => {
                const fillPct =
                  row.targetPercent && row.targetPercent > 0 && row.actualPercent != null
                    ? Math.min(140, (row.actualPercent / row.targetPercent) * 100)
                    : row.actualPercent
                      ? Math.min(100, row.actualPercent)
                      : 0;
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{row.name}</span>
                      <span className={row.over ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {row.actualPercent != null ? `${row.actualPercent.toFixed(1)}%` : "—"}
                        {row.targetPercent != null ? ` / ${row.targetPercent}%` : ""}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", row.over ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${Math.max(2, fillPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <details className="rounded-lg border bg-muted/30 p-3 text-sm">
              <summary className="cursor-pointer text-primary">עריכת מחזור ויעדים</summary>
              <form action={saveDashboardSettings} className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">מחזור חזוי לחודש (₪)</span>
                  <input
                    name="forecastTurnoverIls"
                    type="number"
                    min={0}
                    step="100"
                    defaultValue={forecast}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">סף סניף סורר (נקודות אחוז מעל/מתחת ליעד)</span>
                  <input
                    name="rogueDeviationPercent"
                    type="number"
                    min={0}
                    step="0.1"
                    defaultValue={rogue.threshold}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  />
                </label>
                {fill.map((row) => (
                  <label key={row.id} className="space-y-1">
                    <span className="text-xs text-muted-foreground">{row.name} %</span>
                    <input
                      name={`target:${row.id}`}
                      type="number"
                      min={0}
                      step="0.1"
                      defaultValue={row.targetPercent ?? ""}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    />
                  </label>
                ))}
                <button type="submit" className={cn(buttonVariants({ size: "sm" }), "sm:col-span-2")}>
                  שמירה
                </button>
              </form>
            </details>
          </CardContent>
        </Card>

        <Card className={anomalyCount > 0 ? "ring-1 ring-destructive/40" : undefined}>
          <CardHeader>
            <CardTitle>חריגות מחיר ומסמך</CardTitle>
            <CardDescription>
              {anomalyCount === 0 ? "אין חריגות פתוחות." : `${anomalyCount} פריטים לבדיקה.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {anomalies.pricePending.slice(0, 3).map((receipt) => (
              <Link key={receipt.id} href={`/receipts/${receipt.id}`} className="block hover:underline">
                מחיר שונה · {receipt.order.supplier.name}
              </Link>
            ))}
            {anomalies.missing.slice(0, 2).map((line) => (
              <Link key={line.id} href={`/receipts/${line.goodsReceiptId}`} className="block hover:underline">
                חוסר · {line.orderLine.product.name}
              </Link>
            ))}
            {anomalies.unclassified > 0 ? (
              <Link href="/invoices" className="block text-primary hover:underline">
                {anomalies.unclassified} חשבוניות ממתינות לסיווג
              </Link>
            ) : null}
            {anomalyCount === 0 ? <p className="text-muted-foreground">הכול תקין החודש.</p> : null}
            <Link href="/anomalies" className="text-xs text-primary hover:underline">
              פירוט וסינון
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סחורה לקליטה היום</CardTitle>
            <CardDescription>הזמנות פתוחות שיום האספקה שלהן היום.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {toReceive.length === 0 ? (
              <p className="text-muted-foreground">אין קליטות מתוכננות להיום.</p>
            ) : (
              toReceive.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}/receive`} className="flex justify-between hover:underline">
                  <span>
                    {order.supplier.name}
                    {session.isNetwork ? ` · ${order.branch.name}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {formatIls(order.lines.reduce((s, l) => s + lineTotal(l.qty, l.unitPrice, l.discountPercent), 0))}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הזמנות להוציא היום</CardTitle>
            <CardDescription>חלון הזמנה פתוח, ואין הזמנה פתוחה לספק.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {toOrder.length === 0 ? (
              <p className="text-muted-foreground">אין ספקים שצריך להזמין מהם עכשיו.</p>
            ) : (
              toOrder.map((supplier) => (
                <Link
                  key={supplier.id}
                  href={`/orders/new?supplierId=${supplier.id}`}
                  className="block hover:underline"
                >
                  {supplier.name} · סגירה {supplier.orderCutoffTime}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
