/**
 * Trust Score (0–100): a weighted blend of fulfilment and service signals.
 * Every input is shown to shoppers in the hover breakdown, so keep it explainable.
 */
export type TrustInputs = {
  onTimeRate: number; // 0..1 share of orders delivered by the promised date
  returnRate: number; // 0..1
  cancelRate: number; // 0..1
  reviewRating: number; // 0..5 average from verified buyers
  responseHours: number; // median first response time
};

export const TRUST_WEIGHTS = { onTime: 30, returns: 15, cancellations: 15, reviews: 25, response: 15 } as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

export function trustComponents(i: TrustInputs) {
  return {
    onTime: clamp01(i.onTimeRate) * TRUST_WEIGHTS.onTime,
    // A 20% return rate or worse scores zero on this component.
    returns: clamp01(1 - i.returnRate / 0.2) * TRUST_WEIGHTS.returns,
    // A 10% cancellation rate or worse scores zero.
    cancellations: clamp01(1 - i.cancelRate / 0.1) * TRUST_WEIGHTS.cancellations,
    reviews: clamp01((i.reviewRating - 1) / 4) * TRUST_WEIGHTS.reviews,
    // Within 2h is perfect; 72h or slower scores zero.
    response: clamp01(1 - (i.responseHours - 2) / 70) * TRUST_WEIGHTS.response,
  };
}

export function computeTrustScore(i: TrustInputs) {
  const c = trustComponents(i);
  return Math.round(c.onTime + c.returns + c.cancellations + c.reviews + c.response);
}

export function trustLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs improvement";
}
