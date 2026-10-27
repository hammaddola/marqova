import { deliveryOptions, type DeliveryOption } from "./delivery";

export type PricedLine = { unitPrice: number; quantity: number; shippingFee: number; storeId: string };
export type CouponLike = { code: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: number; minSubtotal: number; storeId?: string | null };

export type Totals = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponApplied: string | null;
  couponError: string | null;
  delivery: DeliveryOption;
  options: DeliveryOption[];
};

/**
 * Computes the full, upfront price breakdown. There are no hidden fees: what is
 * returned here is exactly what the shopper pays.
 */
export function computeTotals(lines: PricedLine[], opts: { coupon?: CouponLike | null; deliveryId?: string | null } = {}): Totals {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  // Shipping is charged once per store parcel (the highest per-item fee in that parcel).
  const perStore = new Map<string, number>();
  for (const l of lines) perStore.set(l.storeId, Math.max(perStore.get(l.storeId) ?? 0, l.shippingFee));
  const baseShipping = [...perStore.values()].reduce((s, v) => s + v, 0);

  const options = deliveryOptions(subtotal, baseShipping);
  const delivery = options.find((o) => o.id === opts.deliveryId) ?? options[0];
  let shipping = lines.length ? delivery.fee : 0;

  let discount = 0;
  let couponApplied: string | null = null;
  let couponError: string | null = null;
  const c = opts.coupon;
  if (c) {
    const eligible = c.storeId ? lines.filter((l) => l.storeId === c.storeId) : lines;
    const eligibleSubtotal = eligible.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    if (!eligible.length) couponError = "This coupon doesn't apply to items in your cart.";
    else if (eligibleSubtotal < c.minSubtotal) couponError = "Your cart doesn't meet this coupon's minimum spend yet.";
    else {
      couponApplied = c.code;
      if (c.type === "PERCENT") discount = Math.round((eligibleSubtotal * Math.min(c.value, 100)) / 100);
      else if (c.type === "FIXED") discount = Math.min(c.value, eligibleSubtotal);
      else shipping = 0;
    }
  }

  return { subtotal, shipping, discount, total: Math.max(0, subtotal + shipping - discount), couponApplied, couponError, delivery, options };
}
