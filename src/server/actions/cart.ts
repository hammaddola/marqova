"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findCart, getOrCreateCart, loadCoupon } from "@/server/cart";
import { trackStat } from "@/server/orders";
import type { ActionResult } from "@/lib/validation";

const addSchema = z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(99) });

export async function addToCart(input: { variantId: string; quantity: number }): Promise<ActionResult<{ count: number }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid item" };
  const variant = await db.productVariant.findUnique({ where: { id: parsed.data.variantId }, include: { product: { select: { status: true, id: true } } } });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") return { ok: false, error: "This item is no longer available." };
  const cart = await getOrCreateCart();
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } } });
  const nextQty = (existing?.quantity ?? 0) + parsed.data.quantity;
  if (nextQty > variant.stock) return { ok: false, error: variant.stock ? `Only ${variant.stock} left in stock.` : "This option is out of stock." };
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity: nextQty },
    create: { cartId: cart.id, variantId: variant.id, quantity: parsed.data.quantity },
  });
  await trackStat(variant.product.id, "addToCarts");
  const agg = await db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
  revalidatePath("/", "layout");
  return { ok: true, data: { count: agg._sum.quantity ?? 0 } };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<ActionResult> {
  const cart = await findCart();
  if (!cart) return { ok: false, error: "Cart not found" };
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
  if (!item) return { ok: false, error: "Item not found" };
  const q = Math.max(0, Math.min(99, Math.floor(quantity)));
  if (q === 0) await db.cartItem.delete({ where: { id: item.id } });
  else {
    if (q > item.variant.stock) return { ok: false, error: `Only ${item.variant.stock} left in stock.` };
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: q } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItem(itemId: string) {
  return updateCartItem(itemId, 0);
}

export async function applyCoupon(code: string): Promise<ActionResult> {
  const cart = await findCart();
  if (!cart) return { ok: false, error: "Your cart is empty." };
  const clean = code.trim().toUpperCase();
  if (!clean) {
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    revalidatePath("/cart");
    revalidatePath("/checkout");
    return { ok: true, message: "Coupon removed" };
  }
  const coupon = await loadCoupon(clean);
  if (!coupon) return { ok: false, error: "That code isn't valid or has expired." };
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true, message: `${coupon.code} applied` };
}
