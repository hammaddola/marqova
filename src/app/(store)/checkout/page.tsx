import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import { getPaymentProviders } from "@/lib/providers/payment";
import { getCartView, loadCoupon } from "@/server/cart";
import { getSessionUser } from "@/server/session";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { catalogInPreview } from "@/components/layout/preview-notice";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const [view, user] = await Promise.all([getCartView(), getSessionUser()]);
  if (!view.purchasable.length) redirect("/cart");

  const coupon = await loadCoupon(view.couponCode);
  const lines = view.purchasable.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, shippingFee: l.product.shippingFee, storeId: l.product.storeId }));
  // Server-computed totals for every delivery option, so the client never does price maths.
  const quotes = Object.fromEntries(view.totals.options.map((o) => [o.id, computeTotals(lines, { coupon, deliveryId: o.id })]));
  const addresses = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  const providers = getPaymentProviders().map((p) => ({ id: p.id, label: p.label, description: p.description }));

  return (
    <div className="container-page py-8">
      <h1 className="heading-display mb-6 text-3xl">Checkout</h1>
      {(await catalogInPreview()) && (
        <p role="note" className="mb-6 rounded-[8px] border border-gold-500/40 bg-gold-100/60 px-4 py-3 text-sm">
          <strong>Preview checkout.</strong> You can go through every step, but this order won&apos;t be shipped and nobody will be charged.
        </p>
      )}
      <CheckoutForm
        email={user?.email ?? ""}
        signedIn={!!user}
        cancelled={sp.cancelled === "1"}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region, postalCode: a.postalCode, country: a.country }))}
        providers={providers}
        options={view.totals.options}
        quotes={quotes}
        items={view.purchasable.map((l) => ({ id: l.id, title: l.product.title, variant: l.variantTitle, quantity: l.quantity, price: l.unitPrice * l.quantity, image: l.image?.url ?? null, minDays: l.product.deliveryMinDays, maxDays: l.product.deliveryMaxDays }))}
      />
    </div>
  );
}
