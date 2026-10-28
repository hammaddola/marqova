import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { formatPrice, siteUrl } from "@/lib/utils";
import { layoutEmail } from "@/lib/providers/email";
import { formatDeliveryWindow } from "@/lib/delivery";
import { enqueue, kickJobs, PRIORITY } from "./jobs";

/** Marks a paid (or cash-on-delivery) order as placed and sends the confirmation email. Idempotent. */
export async function markOrderPlaced(orderId: string) {
  const existing = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!existing || existing.status !== "PENDING_PAYMENT") return null;
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: "PLACED", placedAt: new Date() },
    include: { items: { include: { product: { select: { deliveryMinDays: true, deliveryMaxDays: true } } } } },
  });
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.title)} <span style="color:#5B6575">(${escapeHtml(i.variantTitle)}) × ${i.quantity}</span></td><td align="right">${formatPrice(i.unitPrice * i.quantity)}</td></tr>`)
    .join("");
  const eta = order.items[0] ? formatDeliveryWindow(order.items[0].product.deliveryMinDays, order.items[0].product.deliveryMaxDays) : "";
  await enqueue(
    "email.send",
    {
      to: order.email,
      subject: order.isSample ? `Preview order ${order.number} received (not shipped or charged)` : `Order ${order.number} confirmed`,
      html: layoutEmail(
        order.isSample ? "Preview order received — nothing will be shipped or charged" : "Thank you — your order is confirmed",
        `<p>Order <strong>${order.number}</strong>${eta ? ` · estimated delivery ${eta}` : ""}</p><table width="100%" style="font-size:14px">${rows}
<tr><td style="padding-top:10px;border-top:1px solid #E6E1D6">Delivery</td><td align="right" style="padding-top:10px;border-top:1px solid #E6E1D6">${formatPrice(order.shippingTotal)}</td></tr>
${order.discountTotal ? `<tr><td>Discount</td><td align="right">−${formatPrice(order.discountTotal)}</td></tr>` : ""}
<tr><td><strong>Total</strong></td><td align="right"><strong>${formatPrice(order.total)}</strong></td></tr></table>
<p><a href="${siteUrl(`/account/orders/${order.id}`)}" style="color:#7A5E1C">Track your order</a></p>`,
      ),
    },
    { priority: PRIORITY.critical },
  );
  const stores = await db.store.findMany({ where: { id: { in: [...new Set(order.items.map((i) => i.storeId))] } }, select: { seller: { select: { userId: true } } } });
  await db.notification.createMany({
    data: stores.map((s) => ({ userId: s.seller.userId, type: "NEW_ORDER", title: "New order", body: `Order ${order.number} is waiting to be accepted.`, href: "/seller/orders" })),
  });
  after(kickJobs);
  return order;
}

/** Puts reserved stock back when a payment fails or an unpaid order is cancelled. */
export async function releaseOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status === "CANCELLED") return;
  await db.$transaction(async (tx) => {
    for (const i of order.items) {
      await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
      const inv = await tx.inventory.findFirst({ where: { variantId: i.variantId } });
      if (inv) await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: i.quantity } } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.orderItem.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
  });
}

export async function trackStat(productId: string, field: "views" | "addToCarts" | "orders", revenue = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  await db.productDailyStat
    .upsert({
      where: { productId_date: { productId, date } },
      update: { [field]: { increment: 1 }, ...(revenue ? { revenue: { increment: revenue } } : {}) },
      create: { productId, date, [field]: 1, revenue },
    })
    .catch(() => {});
}

export function escapeHtml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}
