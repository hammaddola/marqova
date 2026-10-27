import { formatPrice } from "@/lib/utils";
import type { Totals } from "@/lib/pricing";

/** Full price breakdown — exactly what the shopper will pay. */
export function OrderSummary({ totals, itemCount, children }: { totals: Totals; itemCount: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-sand bg-white p-5">
      <h2 className="text-base font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate">Items ({itemCount})</dt>
          <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Delivery ({totals.delivery.label.toLowerCase()})</dt>
          <dd className={totals.shipping === 0 ? "font-semibold text-emerald" : "tabular-nums"}>{totals.shipping === 0 ? "FREE" : formatPrice(totals.shipping)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-crimson">
            <dt>Discount ({totals.couponApplied})</dt>
            <dd className="tabular-nums">−{formatPrice(totals.discount)}</dd>
          </div>
        )}
        {totals.couponError && <p className="text-xs text-crimson">{totals.couponError}</p>}
        <div className="flex justify-between border-t border-sand pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(totals.total)}</dd>
        </div>
        <p className="text-xs text-slate">Includes all taxes and fees. Nothing is added at payment.</p>
      </dl>
      {children}
    </div>
  );
}
