"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/utils";
import { checkoutSchema, fieldErrors, type ActionResult } from "@/lib/validation";
import { getPaymentProvider } from "@/lib/providers/payment";
import { getCartView } from "@/server/cart";
import { getSessionUser } from "@/server/session";
import { markOrderPlaced, releaseOrder, trackStat } from "@/server/orders";
import { cartKind } from "@/lib/marketplace";
import { rateLimit } from "@/lib/rate-limit";
import { clientBucket } from "@/lib/request";

class CheckoutError extends Error {}

export async function placeOrder(raw: unknown): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check your details.", fields: fieldErrors(parsed.error) };
  const input = parsed.data;
  const user = await getSessionUser();
  // Orders reserve stock immediately, so scripted checkouts could empty the shelves.
  const bucket = clientBucket(await headers(), 5);
  if (!rateLimit(`checkout:${bucket.key}`, bucket.limit, 10 * 60_000).ok)
    return { ok: false, error: "Too many orders in a short time. Please wait a few minutes and try again." };

  const provider = getPaymentProvider(input.paymentMethod);
  if (!provider) return { ok: false, error: "That payment method isn't available." };

  // Totals are always recomputed on the server — the client never sets a price.
  const view = await getCartView(input.deliveryId);
  if (!view.cart || !view.purchasable.length) return { ok: false, error: "Your cart is empty or items are unavailable." };
  if (view.purchasable.length !== view.lines.length) return { ok: false, error: "Some items changed availability. Please review your cart." };
  const { totals } = view;
  // Preview items are never for sale: they can't share an order with real items and are never charged.
  const kind = cartKind(view.purchasable);
  if (kind === "mixed") return { ok: false, error: "Preview items can't be ordered together with items that are for sale. Remove the preview items to continue." };
  const preview = kind === "preview";

  let order;
  try {
    order = await db.$transaction(async (tx) => {
      for (const line of view.purchasable) {
        // Atomic stock reservation: fails if someone else bought the last unit.
        const res = await tx.productVariant.updateMany({ where: { id: line.variantId, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
        if (res.count !== 1) throw new CheckoutError(`Sorry, "${line.product.title}" just sold out in that option.`);
        const inv = await tx.inventory.findFirst({ where: { variantId: line.variantId, quantity: { gte: line.quantity } }, orderBy: { quantity: "desc" } });
        if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { decrement: line.quantity } } });
        if (!preview) await tx.product.update({ where: { id: line.product.id }, data: { salesCount: { increment: line.quantity } } });
      }
      if (totals.couponApplied) {
        // Conditional increment: parallel checkouts can't spend a limited code twice.
        const used = await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE "code" = ${totals.couponApplied} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (used !== 1) throw new CheckoutError("That discount code has just been used up. Remove it from your cart to continue.");
      }

      const created = await tx.order.create({
        data: {
          number: `MQ-${Date.now().toString(36).toUpperCase()}${randomToken(2).toUpperCase()}`,
          userId: user?.id,
          email: input.email.toLowerCase(),
          status: "PENDING_PAYMENT",
          subtotal: totals.subtotal,
          shippingTotal: totals.shipping,
          discountTotal: totals.discount,
          total: totals.total,
          couponCode: totals.couponApplied,
          isSample: preview,
          deliveryOption: totals.delivery.id,
          paymentMethod: provider.id,
          shippingAddress: input.address,
          items: {
            create: view.purchasable.map((l) => ({
              productId: l.product.id,
              variantId: l.variantId,
              storeId: l.product.storeId,
              title: l.product.title,
              variantTitle: l.variantTitle,
              imageUrl: l.image?.url,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          },
        },
      });
      await tx.cartItem.deleteMany({ where: { cartId: view.cart!.id } });
      await tx.cart.update({ where: { id: view.cart!.id }, data: { couponCode: null } });
      if (user && input.saveAddress) {
        const count = await tx.address.count({ where: { userId: user.id } });
        await tx.address.create({ data: { ...input.address, userId: user.id, isDefault: count === 0 } });
      }
      return created;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    throw err;
  }

  // Preview orders skip the payment provider entirely: no payment record, no charge.
  const payment = preview ? null : await provider.createPayment({ orderId: order.id, orderNumber: order.number, amount: order.total, currency: "PKR", email: order.email });
  if (payment) {
    await db.payment.create({ data: { orderId: order.id, provider: provider.id, method: provider.id, amount: order.total, status: payment.status, providerRef: payment.providerRef } });
    if (payment.status === "FAILED") {
      await releaseOrder(order.id);
      return { ok: false, error: payment.message ?? "Payment was declined. No money was taken." };
    }
  }
  // Card payments (Stripe) are confirmed by the webhook; mock/COD and preview orders are placed immediately.
  if (!payment?.redirectUrl) await markOrderPlaced(order.id);

  // Lets a guest (and only that browser) view the confirmation page.
  if (!user) (await cookies()).set("mq_last_order", order.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24, path: "/" });
  if (!preview) for (const l of view.purchasable) await trackStat(l.product.id, "orders", l.unitPrice * l.quantity);
  revalidatePath("/", "layout");
  return { ok: true, data: { redirectUrl: payment?.redirectUrl ?? `/checkout/confirmation/${order.id}` } };
}
