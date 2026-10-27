import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/providers/payment";
import { markOrderPlaced, releaseOrder } from "@/server/orders";

/** Stripe webhook: confirms card payments. Signature-verified; never trusts the redirect alone. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  const sig = req.headers.get("stripe-signature") ?? "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    const session = event.data.object;
    const payment = await db.payment.findFirst({ where: { providerRef: session.id } });
    if (payment) {
      if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
        await db.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED" } });
        await markOrderPlaced(payment.orderId);
      } else if (event.type === "checkout.session.expired") {
        await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        await releaseOrder(payment.orderId);
      }
    }
  }
  return NextResponse.json({ received: true });
}
