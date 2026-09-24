/** Network / Kiryat list prices are at or below the franchisee list. Charge the franchisee price. */
export function chargeUnitPrice(franchiseePrice: number, networkPrice?: number | null) {
  if (!Number.isFinite(franchiseePrice) || franchiseePrice < 0) {
    throw new Error("מחירון זכיין לא תקין");
  }
  if (networkPrice != null && networkPrice > franchiseePrice + 1e-9) {
    throw new Error("מחירון הרשת גבוה ממחירון הזכיין");
  }
  return franchiseePrice;
}

export function transferAmount(qty: number, unitPrice: number) {
  return qty * unitPrice;
}

export function mutualApproval(input: { fromApproved: boolean; toApproved: boolean }) {
  return input.fromApproved && input.toApproved ? "APPROVED" : "PENDING";
}

export function monthSettlement(input: {
  transfers: { amountIls: number; status: string }[];
  royaltyBase: number;
  royaltyPercent: number;
}) {
  const transfers = input.transfers
    .filter((row) => row.status === "APPROVED")
    .reduce((sum, row) => sum + row.amountIls, 0);
  const royalty = (input.royaltyBase * input.royaltyPercent) / 100;
  return { transfers, royalty, total: transfers + royalty };
}
