import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CheckCircle2, Clock, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/providers/payment";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/brand";
import { Reveal } from "@/components/motion";
import { getSessionUser } from "@/server/session";
import { markOrderPlaced } from "@/server/orders";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/checkout/confirmation/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await db.order.findUnique({ where: { id }, include: { items: true, payments: true } });
  if (!order) notFound();
  const user = await getSessionUser();
  // Signed-in users see their own orders; guests only the order placed from this browser.
  const guestOrder = (await cookies()).get("mq_last_order")?.value;
  if (order.userId ? order.userId !== user?.id : guestOrder !== order.id) notFound();

  // Stripe return: double-check the session server-side (the webhook is the source of truth).
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (sessionId && order.status === "PENDING_PAYMENT") {
    const stripe = getStripe();
    const session = stripe ? await stripe.checkout.sessions.retrieve(sessionId).catch(() => null) : null;
    if (session?.payment_status === "paid" && session.client_reference_id === order.id) {
      await db.payment.updateMany({ where: { orderId: order.id, providerRef: session.id }, data: { status: "CAPTURED" } });
      await markOrderPlaced(order.id);
      order = (await db.order.findUnique({ where: { id }, include: { items: true, payments: true } }))!;
    }
  }

  const address = order.shippingAddress as { fullName?: string; line1?: string; city?: string };
  const pending = order.status === "PENDING_PAYMENT";

  return (
    <div className="container-page max-w-3xl py-12">
      <Reveal>
        <div className="text-center">
          {pending ? <Clock className="mx-auto size-14 text-gold-text" aria-hidden /> : <CheckCircle2 className="mx-auto size-14 text-emerald" aria-hidden />}
          <h1 className="heading-display mt-4 text-3xl">{pending ? "Waiting for payment confirmation" : "Thank you — your order is placed"}</h1>
          <p className="mt-2 text-slate">
            Order <strong className="text-ink">{order.number}</strong>
            {order.paymentMethod === "cod" && " · Pay in cash on delivery"}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate">
            <Mail className="size-4" aria-hidden /> A confirmation was sent to {order.email}
          </p>
        </div>
      </Reveal>
      <div className="mt-8 rounded-[8px] border border-sand bg-white p-6">
        <ul className="divide-y divide-sand">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-sand-50">{i.imageUrl && <ProductImage src={i.imageUrl} alt="" sizes="56px" />}</span>
              <span className="flex-1 text-sm">
                <span className="block font-medium">{i.title}</span>
                <span className="text-xs text-slate">
                  {i.variantTitle} × {i.quantity}
                </span>
              </span>
              <span className="text-sm font-semibold">{formatPrice(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-sand pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate">Items</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate">Delivery</dt><dd>{order.shippingTotal ? formatPrice(order.shippingTotal) : "FREE"}</dd></div>
          {order.discountTotal > 0 && <div className="flex justify-between text-crimson"><dt>Discount</dt><dd>−{formatPrice(order.discountTotal)}</dd></div>}
          <div className="flex justify-between text-base font-semibold"><dt>Total paid{order.paymentMethod === "cod" ? " on delivery" : ""}</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
        {address.line1 && (
          <p className="mt-4 text-sm text-slate">
            Shipping to {address.fullName}, {address.line1}, {address.city}
          </p>
        )}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {user && (
          <Button asChild variant="navy">
            <Link href={`/account/orders/${order.id}`}>Track this order</Link>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
