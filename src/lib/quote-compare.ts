export type QuoteInputLine = {
  name: string;
  offered: number;
  monthlyQty: number;
  monthAvg: number | null;
  yearAvg: number | null;
};

export function compareQuoteLine(line: QuoteInputLine) {
  const vsMonth = line.monthAvg == null ? null : line.offered - line.monthAvg;
  const vsYear = line.yearAvg == null ? null : line.offered - line.yearAvg;
  const reference = line.yearAvg ?? line.monthAvg;
  const verdict = reference == null ? "unknown" : line.offered < reference - 1e-9 ? "cheaper" : line.offered > reference + 1e-9 ? "pricier" : "same";
  return {
    ...line,
    vsMonth,
    vsYear,
    verdict: verdict as "cheaper" | "pricier" | "same" | "unknown",
    monthImpact: vsMonth == null ? null : vsMonth * line.monthlyQty,
    yearImpact: vsYear == null ? null : vsYear * line.monthlyQty * 12,
  };
}

export function compareQuoteBasket(lines: QuoteInputLine[]) {
  const compared = lines.map(compareQuoteLine);
  const monthImpact = compared.reduce((sum, line) => sum + (line.monthImpact ?? 0), 0);
  const yearImpact = compared.reduce((sum, line) => sum + (line.yearImpact ?? 0), 0);
  const monthBase = compared.reduce((sum, line) => sum + (line.monthAvg ?? 0) * line.monthlyQty, 0);
  const yearBase = compared.reduce((sum, line) => sum + (line.yearAvg ?? 0) * line.monthlyQty * 12, 0);
  return {
    lines: compared,
    monthImpact,
    yearImpact,
    monthPercent: monthBase > 0 ? (monthImpact / monthBase) * 100 : null,
    yearPercent: yearBase > 0 ? (yearImpact / yearBase) * 100 : null,
  };
}

export function matchQuoteName(offeredName: string, catalog: { id: string; name: string }[]) {
  const folded = offeredName.trim().toLowerCase();
  if (!folded) return null;
  const exact = catalog.find((item) => item.name.trim().toLowerCase() === folded);
  if (exact) return exact.id;
  const partial = catalog.filter((item) => {
    const name = item.name.trim().toLowerCase();
    return name.includes(folded) || folded.includes(name);
  });
  return partial.length === 1 ? partial[0].id : null;
}
