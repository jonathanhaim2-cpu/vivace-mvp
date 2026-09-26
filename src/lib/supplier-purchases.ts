/** Year-to-date total and monthly average across elapsed months (1..throughMonth). */
export function ytdPurchaseStats(
  amountByMonth: Record<string, number>,
  year: number,
  throughMonth: number,
) {
  const elapsed = Math.min(12, Math.max(1, throughMonth));
  let ytd = 0;
  for (let month = 1; month <= elapsed; month += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    ytd += amountByMonth[key] ?? 0;
  }
  return { ytd, average: ytd / elapsed, elapsedMonths: elapsed };
}

/** Null when the network has no sales/revenue figure to divide by. */
export function networkRevenueSharePercent(monthlyAverage: number, monthlyRevenue: number | null | undefined) {
  if (monthlyRevenue == null || !Number.isFinite(monthlyRevenue) || monthlyRevenue <= 0) return null;
  return (monthlyAverage / monthlyRevenue) * 100;
}
