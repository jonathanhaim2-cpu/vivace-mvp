export function chargeDayFor(input: {
  paymentChargeDay?: number | null;
  paymentMethod?: string | null;
  cardBillingDay?: number | null;
}) {
  const raw =
    input.cardBillingDay ??
    input.paymentChargeDay ??
    (input.paymentMethod?.startsWith("CARD") ? 15 : 1);
  if (!Number.isFinite(raw)) return 15;
  return Math.min(28, Math.max(1, Math.round(raw)));
}

export function projectBalance(opening: number, days: { day: number; amountIls: number }[]) {
  let balance = opening;
  return days.map((bucket) => {
    balance -= bucket.amountIls;
    return { day: bucket.day, outflow: bucket.amountIls, balance };
  });
}
