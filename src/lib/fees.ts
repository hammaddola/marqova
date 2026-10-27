/** Transparent seller fee calculation, shared by the fee calculator UI and payouts. */
export type FeeInput = { salePrice: number; quantity?: number; commissionBps: number; fixedPerItem?: number; paymentBps?: number };

export const DEFAULT_FIXED_FEE = 25_00; // Rs 25 per item
export const DEFAULT_PAYMENT_BPS = 200; // 2%

export function calculateFees({ salePrice, quantity = 1, commissionBps, fixedPerItem = DEFAULT_FIXED_FEE, paymentBps = DEFAULT_PAYMENT_BPS }: FeeInput) {
  const gross = salePrice * quantity;
  const commission = Math.round((gross * commissionBps) / 10_000);
  const fixed = fixedPerItem * quantity;
  const payment = Math.round((gross * paymentBps) / 10_000);
  const totalFees = commission + fixed + payment;
  return { gross, commission, fixed, payment, totalFees, net: gross - totalFees, effectiveRate: gross ? totalFees / gross : 0 };
}
