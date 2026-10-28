import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { CartLines, CouponForm } from "@/components/cart/cart-lines";
import { OrderSummary } from "@/components/cart/summary";
import { ProductRail } from "@/components/product/product-rail";
import { getCartView } from "@/server/cart";
import { getBestsellers } from "@/server/catalog";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/delivery";
import { formatPrice } from "@/lib/utils";
import { MULTI_SELLER } from "@/lib/marketplace";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const view = await getCartView();
  const count = view.lines.reduce((s, l) => s + l.quantity, 0);

  if (!view.lines.length) {
    const picks = await getBestsellers(10);
    return (
      <div className="container-page space-y-12 py-10">
        <EmptyState icon={<ShoppingCart />} title="Your cart is empty" body={`Browse every niche${MULTI_SELLER ? " from verified sellers" : ""} — prices always include the delivery estimate.`} action={<Button asChild variant="gold"><Link href="/search">Start shopping</Link></Button>} />
        <ProductRail products={picks} label="Popular right now" />
      </div>
    );
  }

  const toFree = FREE_DELIVERY_THRESHOLD - view.totals.subtotal;
  const blocked = view.purchasable.length !== view.lines.length;

  return (
    <div className="container-page py-8">
      <h1 className="heading-display mb-6 text-3xl">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {toFree > 0 ? (
            <div className="rounded-[8px] bg-gold-100/60 px-4 py-3 text-sm">
              Add <strong>{formatPrice(toFree)}</strong> more for FREE standard delivery.
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${Math.min(100, (view.totals.subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <p className="rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald">Your order qualifies for FREE standard delivery.</p>
          )}
          <CartLines
            lines={view.lines.map((l) => ({
              id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, stock: l.stock, available: l.available, quantityTooHigh: l.quantityTooHigh,
              variantTitle: l.variantTitle, title: l.product.title, slug: l.product.slug, storeName: l.product.store.name, image: l.image?.url ?? null, returnWindowDays: l.product.returnWindowDays,
            }))}
          />
        </div>
        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <OrderSummary totals={view.totals} itemCount={count}>
            <div className="mt-4 space-y-3">
              <CouponForm current={view.couponCode} />
              <Button asChild variant="gold" size="lg" className={`w-full ${blocked ? "pointer-events-none opacity-50" : ""}`}>
                <Link href="/checkout" aria-disabled={blocked}>
                  <Lock /> Proceed to checkout
                </Link>
              </Button>
              {blocked && <p className="text-xs text-crimson">Remove unavailable items to continue.</p>}
              <p className="text-center text-xs text-slate">Guest checkout available — no account needed.</p>
            </div>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
