import { ReportsNav } from "@/components/reports/reports-nav";
import { PageHeader } from "@/components/page-header";
import { formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const lines = await prisma.goodsReceiptLine.findMany({
    where: { receivedQty: { gt: 0 }, invoicePrice: { gt: 0 } },
    include: { goodsReceipt: true, orderLine: { include: { product: true } } },
    orderBy: { goodsReceipt: { createdAt: "asc" } },
  });

  const byMonth = new Map<string, { spend: number; qty: number; prices: number[] }>();
  for (const line of lines) {
    const key = line.goodsReceipt.createdAt.toISOString().slice(0, 7);
    const bucket = byMonth.get(key) ?? { spend: 0, qty: 0, prices: [] };
    bucket.spend += line.receivedQty * line.invoicePrice;
    bucket.qty += line.receivedQty;
    bucket.prices.push(line.invoicePrice);
    byMonth.set(key, bucket);
  }
  const months = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([month, bucket]) => ({
      month,
      spend: bucket.spend,
      avg: bucket.qty > 0 ? bucket.spend / bucket.qty : 0,
    }));

  const avgs = months.map((row) => row.avg).filter((value) => value > 0);
  const mean = avgs.length ? avgs.reduce((sum, value) => sum + value, 0) / avgs.length : 0;
  const variance = avgs.length
    ? avgs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / avgs.length
    : 0;
  const volatility = Math.sqrt(variance);

  const maxAvg = Math.max(1, ...months.map((row) => row.avg));
  const width = 640;
  const height = 180;
  const points = months
    .map((row, index) => {
      const x = months.length <= 1 ? width / 2 : (index / (months.length - 1)) * width;
      const y = height - (row.avg / maxAvg) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(" ");

  const yoy = months.map((row) => {
    const prev = months.find((item) => item.month === `${Number(row.month.slice(0, 4)) - 1}${row.month.slice(4)}`);
    if (!prev || prev.spend === 0) return null;
    return { month: row.month, percent: ((row.spend - prev.spend) / prev.spend) * 100 };
  }).filter((row): row is { month: string; percent: number } => row != null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="מגמות מחיר ועלות"
        description="ממוצע משוקלל של מחירי קליטה לפי חודש, שינוי מול השנה שעברה, ותנודתיות. עוזר לראות אם עלות המזון זזה."
      />
      <ReportsNav />
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">ממוצע יחידה (חלון)</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(mean)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">תנודתיות (סטיית תקן)</p>
          <p className="text-xl font-semibold tabular-nums">{formatIls(volatility)}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">חודשים בגרף</p>
          <p className="text-xl font-semibold tabular-nums">{months.length}</p>
        </article>
      </div>
      {months.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין קליטות עם מחיר עדיין.</p>
      ) : (
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">מחיר ממוצע ליחידה</p>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="מגמת מחיר">
            <polyline fill="none" stroke="#3f6b4e" strokeWidth="3" points={points} />
          </svg>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {months.slice(-8).map((row) => (
              <li key={row.month} className="flex justify-between gap-2">
                <span>{row.month}</span>
                <span className="tabular-nums">
                  {formatIls(row.avg)} · {formatIls(row.spend)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {yoy.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {yoy.slice(-6).map((row) => (
            <li key={row.month} className="flex justify-between gap-2">
              <span>רכש {row.month} מול שנה קודמת</span>
              <span className={row.percent > 0 ? "text-trend-down" : "text-trend-up"}>
                {row.percent > 0 ? "▲" : "▼"} {Math.abs(row.percent).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
