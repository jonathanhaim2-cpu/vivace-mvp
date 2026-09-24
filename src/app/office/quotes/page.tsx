import { analyzeSupplierQuote } from "@/actions/quotes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CompactField, CompactPanel } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatIls } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { compareQuoteBasket } from "@/lib/quote-compare";
import { getAppSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const session = await getAppSession();
  const { id } = await searchParams;
  if (!session.isNetwork) {
    return (
      <PageHeader
        title="הצעת מחיר"
        description="השוואת הצעות ספק היא כלי של משרד הרשת."
      />
    );
  }
  const quote = id
    ? await prisma.supplierQuote.findUnique({ where: { id }, include: { lines: true } })
    : await prisma.supplierQuote.findFirst({ orderBy: { createdAt: "desc" }, include: { lines: true } });
  const basket = quote
    ? compareQuoteBasket(
        quote.lines.map((line) => ({
          name: line.name,
          offered: line.offered,
          monthlyQty: line.monthlyQty,
          monthAvg: line.monthAvg,
          yearAvg: line.yearAvg,
        })),
      )
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="הצעת מחיר · משרד רשת"
        description="העלו סריקה או הדביקו שורות שם,מחיר. כל פריט מושווה לממוצע החודשי והשנתי של הרכש, והסל מציג השפעה לחודש ולשנה."
      />
      <CompactPanel title="הצעה חדשה" description="PDF או תמונה. אפשר גם שורות ידניות.">
        <form action={analyzeSupplierQuote} className="grid gap-3">
          <CompactField label="שם ספק" htmlFor="quote-supplier">
            <Input id="quote-supplier" name="supplierName" placeholder="שם הספק" />
          </CompactField>
          <CompactField label="קובץ" htmlFor="quote-file">
            <Input id="quote-file" name="file" type="file" accept="image/*,application/pdf" />
          </CompactField>
          <CompactField label="שורות ידניות" htmlFor="quote-lines" grow>
            <Textarea id="quote-lines" name="lines" rows={4} placeholder={"קמח,12.5\nשמן,18"} />
          </CompactField>
          <Button type="submit">השוואה</Button>
        </form>
      </CompactPanel>
      {quote && basket ? (
        <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="font-medium">{quote.supplierName}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="text-sm">
              השפעה חודשית{" "}
              <span className={basket.monthImpact > 0 ? "text-trend-down" : "text-trend-up"}>
                {formatIls(basket.monthImpact)}
                {basket.monthPercent != null ? ` (${basket.monthPercent.toFixed(1)}%)` : ""}
              </span>
            </p>
            <p className="text-sm">
              השפעה שנתית{" "}
              <span className={basket.yearImpact > 0 ? "text-trend-down" : "text-trend-up"}>
                {formatIls(basket.yearImpact)}
                {basket.yearPercent != null ? ` (${basket.yearPercent.toFixed(1)}%)` : ""}
              </span>
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {basket.lines.map((line) => (
              <li key={line.name} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-2">
                <span>{line.name}</span>
                <span className="tabular-nums">
                  {formatIls(line.offered)}{" "}
                  <span className={line.verdict === "pricier" ? "text-trend-down" : line.verdict === "cheaper" ? "text-trend-up" : "text-muted-foreground"}>
                    {line.verdict === "cheaper" ? "זול יותר" : line.verdict === "pricier" ? "יקר יותר" : line.verdict === "same" ? "זהה" : "אין היסטוריה"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">עדיין אין הצעה שמורה.</p>
      )}
    </div>
  );
}
