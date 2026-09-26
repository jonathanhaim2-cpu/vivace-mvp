import Link from "next/link";
import { saveDashboardSettings } from "@/actions/dashboard";
import { ForecastInputForm } from "@/components/dashboard/forecast-form";
import { NetworkBranchCompare } from "@/components/dashboard/network-branch-compare";
import { TodayTaskList } from "@/components/dashboard/today-task-list";
import { PendingInvoiceCard } from "@/components/invoices/pending-invoice-card";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chooseIngestBranch } from "@/lib/branch-assignment";
import { COMPANY } from "@/lib/constants";
import {
  getAnomalies,
  getCategoryFill,
  getForecastTurnover,
  getGoodsToReceiveToday,
  getOrdersToPlaceToday,
  getNetworkBranchComparison,
  getRogueBranches,
} from "@/lib/dashboard";
import { getOverdueAccountantItems } from "@/lib/ap";
import { formatIls, nowInIsrael } from "@/lib/format";
import { listMissingInvoiceAlerts } from "@/lib/missing-invoice-alerts";
import { INVOICE_APPROVAL, invoiceMismatchFlags } from "@/lib/invoice-approval";
import { monthKeyFromDate, monthLabel, recentMonthKeys } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { getAppSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "ops" || params.view === "mgmt" ? params.view : null;
  const session = await getAppSession();
  const office = session.isNetworkOffice;
  const branchId = session.branchId;
  const month = monthKeyFromDate();
  const clock = nowInIsrael();
  const forecast = await getForecastTurnover();
  const [fill, anomalies, toReceive, toOrder, overdue, rogue, comparison, pending, openCredits, invoiceAlerts] =
    await Promise.all([
    getCategoryFill(month, forecast, branchId),
    getAnomalies(branchId),
    getGoodsToReceiveToday(branchId),
    getOrdersToPlaceToday(branchId, office),
    getOverdueAccountantItems(month),
    office ? getRogueBranches(month, forecast) : Promise.resolve({ threshold: 2, branches: [] as { id: string; name: string; reasons: string[] }[] }),
    office
      ? getNetworkBranchComparison(month, forecast)
      : Promise.resolve({ forecast, branches: [], unattributedInvoices: 0 }),
    prisma.invoicePhoto.findMany({
      where: { approvalStatus: INVOICE_APPROVAL.PENDING, source: "EMAIL" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.supplierRequest.findMany({
      where: {
        status: "OPEN",
        kind: "CREDIT",
        ...(branchId ? { branchId } : {}),
      },
      include: { supplier: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    listMissingInvoiceAlerts({
      today: { year: clock.year, month: clock.month, date: clock.date },
      branchId,
    }),
  ]);

  const anomalyCount =
    anomalies.pricePending.length +
    anomalies.missing.length +
    anomalies.exceptional.length +
    (anomalies.unclassified > 0 ? 1 : 0);
  const overCount = fill.filter((row) => row.over).length;
  const purchaseTotal = fill.reduce((sum, row) => sum + row.spent, 0);
  const title = office ? "משרד רשת" : session.branch?.name ?? "אין סניף עדיין";
  const hour = Math.floor(clock.minutes / 60);
  const greeting =
    hour < 5 ? "לילה טוב" : hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : hour < 21 ? "ערב טוב" : "לילה טוב";
  const who = session.user?.name ? `, ${session.user.name}` : "";
  const executeToday = toOrder.filter((item) => !item.done).length;
  const receiveToday = toReceive.filter((item) => !item.done).length;
  const opsClass = view === "mgmt" ? "hidden" : view === "ops" ? "space-y-4" : "space-y-4 lg:hidden";
  const mgmtClass = view === "ops" ? "hidden" : view === "mgmt" ? "space-y-6" : "hidden space-y-6 lg:block";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${COMPANY.nameHe} · ${COMPANY.tagline} · ${monthLabel(month)}`}
      />
      <div className="flex w-fit gap-1 rounded-full bg-muted p-1 text-sm">
        <Link
          href="/?view=ops"
          className={cn("rounded-full px-3 py-1", view === "ops" ? "bg-card shadow-sm" : "text-muted-foreground")}
        >
          מבט תפעולי
        </Link>
        <Link
          href="/?view=mgmt"
          className={cn("rounded-full px-3 py-1", view === "mgmt" ? "bg-card shadow-sm" : "text-muted-foreground")}
        >
          מבט ניהולי
        </Link>
      </div>
      <section className={opsClass}>
        <div>
          <h2 className="text-2xl font-semibold">
            {greeting}
            {who}!
          </h2>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <div className="grid gap-3">
          <Link href="/orders" className="rounded-2xl border bg-card px-4 py-5 shadow-[var(--shadow-card)]">
            <p className="text-2xl font-semibold tabular-nums">{executeToday}</p>
            <p className="text-sm">הזמנות לביצוע היום</p>
          </Link>
          <Link href="/receiving" className="rounded-2xl border bg-card px-4 py-5 shadow-[var(--shadow-card)]">
            <p className="text-2xl font-semibold tabular-nums">{receiveToday}</p>
            <p className="text-sm">הזמנות לקבלה היום</p>
          </Link>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">חריגים</h2>
        {openCredits.length === 0 && invoiceAlerts.length === 0 ? (
          <p className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">אין חריגים פתוחים.</p>
        ) : (
          <ul className="space-y-2">
            {openCredits.map((credit) => (
              <li key={credit.id}>
                <Link href="/credits" className="block rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  בקשת זיכוי פתוחה · {credit.supplier.name}
                  {office ? ` · ${credit.branch.name}` : ""}
                </Link>
              </li>
            ))}
            {invoiceAlerts.map((alert) => (
              <li key={alert.id}>
                <Link href={alert.href} className="block rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {alert.message}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className={mgmtClass}>

      {session.branches.length === 0 ? (
        <Link
          href="/settings"
          className="block rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm shadow-[var(--shadow-card)]"
        >
          אין סניפים במערכת. הוסיפו סניף בהגדרות כדי להתחיל הזמנות, מלאי ופחת.
        </Link>
      ) : null}

      {overdue.length > 0 ? (
        <Link
          href="/ap"
          className="block rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {overdue.length} הוצאות לא מרכש בלי סימון שולם/נשלח להנה״ח (אחרי ה-10 לחודש)
        </Link>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["מחזור חזוי", formatIls(forecast)],
          ["רכש החודש", formatIls(purchaseTotal)],
          ["חריגות", String(anomalyCount)],
          ["ממתינות לאישור", String(pending.length)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          </article>
        ))}
      </div>

      {pending.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold">ממתינות לאישור</h2>
            <Link href="/invoices" className="text-xs text-primary hover:underline">
              כל החשבוניות
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            חשבוניות מהמייל לא נכנסות לדוחות עד אישור. אפשר לתקן סניף, סוג מסמך, ספק וסכום.
          </p>
          {pending.map((photo) => {
            const evidence = chooseIngestBranch({
              documentText: [photo.originalName, photo.voiceNoteText, photo.aiReason, photo.aiSupplierName].filter(Boolean).join("\n"),
              branches: session.branches,
            });
            const flags = invoiceMismatchFlags({
              evidenceBranchId: evidence.branchId,
              selectedBranchId: photo.branchId ?? photo.aiBranchId,
            });
            return (
              <div key={photo.id} className="space-y-2">
                {flags.length > 0 ? (
                  <p className="text-xs text-trend-down">{flags.join(" · ")}</p>
                ) : null}
                <PendingInvoiceCard
                  photo={photo}
                  months={recentMonthKeys()}
                  auditStamp=""
                  branches={session.branches}
                  returnTo="/"
                  showReject
                />
              </div>
            );
          })}
        </section>
      ) : null}

      {office && rogue.branches.length > 0 ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">חריגה מיעד (≥ {rogue.threshold} נקודות אחוז)</p>
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

      {office && comparison.branches.length > 0 ? (
        <NetworkBranchCompare
          branches={comparison.branches}
          forecast={comparison.forecast}
          unattributedInvoices={comparison.unattributedInvoices}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={overCount > 0 ? "ring-1 ring-destructive/40" : undefined}>
          <CardHeader>
            <CardTitle>מחזור חזוי מול רכש</CardTitle>
            <CardDescription>
              מילוי קטגוריה מול יעד % מהמחזור
              {office ? " (כל הסניפים)" : ""}. כולל חשבוניות ששובצו גם בלי הזמנה. אדום = מעל היעד. מחזור{" "}
              {formatIls(forecast)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ForecastInputForm forecast={forecast} compact />
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
                      <Link href={`/reports/drill?month=${month}&category=${row.id}`} className="hover:underline">
                        {row.name}
                      </Link>
                      <span className={row.over ? "font-medium text-destructive" : "text-muted-foreground"} dir="ltr">
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
              <summary className="cursor-pointer text-primary">עריכת יעדי קטגוריה וסף סורר</summary>
              <form action={saveDashboardSettings} className="mt-3 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="forecastTurnoverIls" value={forecast} />
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
            <CardTitle>מסמכים חריגים</CardTitle>
            <CardDescription>
              {anomalyCount === 0 ? "אין חריגות פתוחות." : `${anomalyCount} פריטים לבדיקה.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {anomalies.exceptional.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={item.goodsReceiptId ? `/receipts/${item.goodsReceiptId}` : "/anomalies?type=exceptional"}
                className="block hover:underline"
              >
                {item.title}
                {session.isNetwork ? ` · ${item.branch.name}` : ""}
              </Link>
            ))}
            {anomalies.pricePending.slice(0, 2).map((receipt) => (
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>היום</CardTitle>
            <CardDescription>פתוח למעלה. בוצע — ירוק עם V, יורד למטה.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">הזמנות לשליחה</p>
              <TodayTaskList
                items={toOrder.map((item) => ({
                  id: item.id,
                  href: item.href,
                  title: item.name,
                  meta: item.done ? "בוצע" : undefined,
                  done: item.done,
                }))}
              />
              {toOrder.some((item) => !item.done) ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  סגירה: {toOrder.filter((item) => !item.done).slice(0, 1).map((item) => item.cutoff)}
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">סחורה לקליטה</p>
              <TodayTaskList
                items={toReceive.map((item) => ({
                  id: item.id,
                  href: item.href,
                  title: office ? `${item.supplierName} · ${item.branchName}` : item.supplierName,
                  meta: undefined,
                  done: item.done,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
