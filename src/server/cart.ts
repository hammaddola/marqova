import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { computeTotals, type CouponLike } from "@/lib/pricing";
import { getSessionUser } from "./session";

export const CART_COOKIE = "mq_cart";

/** Read-only lookup (safe in Server Components). Merges a guest cart into the user cart when both exist. */
export async function findCart() {
  const user = await getSessionUser();
  const guestId = (await cookies()).get(CART_COOKIE)?.value;
  if (user) {
    let cart = await db.cart.findUnique({ where: { userId: user.id } });
    if (guestId && guestId !== cart?.id) {
      const guest = await db.cart.findFirst({ where: { id: guestId, userId: null }, include: { items: true } });
      if (guest) {
        cart ??= await db.cart.create({ data: { userId: user.id } });
        for (const item of guest.items) {
          await db.cartItem.upsert({
            where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
            update: { quantity: { increment: item.quantity } },
            create: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity },
          });
        }
        await db.cart.delete({ where: { id: guest.id } });
      }
    }
    return cart;
  }
  return guestId ? db.cart.findFirst({ where: { id: guestId, userId: null } }) : null;
}

/** For server actions: finds or creates the cart and sets the guest cookie. */
export async function getOrCreateCart() {
  const existing = await findCart();
  if (existing) return existing;
  const user = await getSessionUser();
  const cart = await db.cart.create({ data: { userId: user?.id } });
  if (!user) {
    (await cookies()).set(CART_COOKIE, cart.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 60, path: "/" });
  }
  return cart;
}

export async function getCartCount() {
  try {
    const cart = await findCart();
    if (!cart) return 0;
    const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
    return agg._sum.quantity ?? 0;
  } catch {
    return 0;
  }
}

export async function loadCoupon(code: string | null | undefined): Promise<CouponLike | null> {
  if (!code) return null;
  const now = new Date();
  const c = await db.coupon.findFirst({
    where: { code: code.toUpperCase(), active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
  });
  if (!c || (c.usageLimit != null && c.usedCount >= c.usageLimit)) return null;
  // Bhao-Taao deals belong to the shopper who haggled for them.
  if (c.userId && c.userId !== (await getSessionUser())?.id) return null;
  return { code: c.code, type: c.type, value: c.value, minSubtotal: c.minSubtotal, storeId: c.storeId, productId: c.productId };
}

export async function getCartView(deliveryId?: string | null) {
  const cart = await findCart();
  const items = cart
    ? await db.cartItem.findMany({
        where: { cartId: cart.id },
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true, slug: true, title: true, status: true, shippingFee: true, storeId: true, deliveryMinDays: true, deliveryMaxDays: true, returnWindowDays: true, isSample: true,
                  store: { select: { name: true, slug: true } },
                  media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
                },
              },
            },
          },
        },
      })
    : [];
  const lines = items.map((i) => {
    const available = i.variant.isActive && i.variant.product.status === "ACTIVE";
    return {
      id: i.id,
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.variant.price,
      compareAtPrice: i.variant.compareAtPrice,
      stock: i.variant.stock,
      available: available && i.variant.stock > 0,
      quantityTooHigh: i.quantity > i.variant.stock,
      variantTitle: i.variant.title,
      sku: i.variant.sku,
      product: i.variant.product,
      image: i.variant.product.media[0] ?? null,
    };
  });
  const purchasable = lines.filter((l) => l.available && !l.quantityTooHigh);
  const coupon = await loadCoupon(cart?.couponCode);
  const totals = computeTotals(
    purchasable.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, shippingFee: l.product.shippingFee, storeId: l.product.storeId, productId: l.product.id })),
    { coupon, deliveryId },
  );
  return { cart, lines, purchasable, totals, couponCode: cart?.couponCode ?? null };
}

export type CartView = Awaited<ReturnType<typeof getCartView>>;
