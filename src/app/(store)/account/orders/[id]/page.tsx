import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { ProductImage } from "@/components/brand";
import { StatusPill } from "@/components/account/status-pill";
import { ReturnDialog, ReviewDialog } from "@/components/account/order-item-actions";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import { isWithinDays } from "@/lib/time";

export const metadata = { title: "Order details" };

const STEPS = ["PLACED", "ACCEPTED", "PACKED", "SHIPPED", "DELIVERED"] as const;
const ITEM_STEP: Record<string, number> = { PENDING: 0, ACCEPTED: 1, PACKED: 2, SHIPPED: 3, DELIVERED: 4, RETURNED: 4, CANCELLED: -1 };

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await db.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { review: { select: { id: true } }, returns: { select: { status: true } }, product: { select: { slug: true, tryOnType: true, returnWindowDays: true } }, shipment: true } },
      payments: { select: { provider: true, status: true } },
    },
  });
  if (!order) notFound();
  const addr = order.shippingAddress as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-gold-text hover:underline">← All orders</Link>
          <h1 className="heading-display mt-1 text-3xl">Order {order.number}</h1>
          <p className="text-sm text-slate">Placed {formatDate(order.createdAt)} · {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      {order.items.map((i) => {
        const step = ITEM_STEP[i.status] ?? 0;
        const delivered = i.status === "DELIVERED";
        const withinWindow = delivered && isWithinDays(i.deliveredAt ?? i.createdAt, i.product.returnWindowDays);
        const events = (i.shipment?.events as { at: string; status: string; location?: string }[] | undefined) ?? [];
        return (
          <article key={i.id} className="rounded-[8px] border border-sand bg-white p-5">
            <div className="flex gap-4">
              <Link href={`/p/${i.product.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-md bg-sand-50">{i.imageUrl && <ProductImage src={i.imageUrl} alt="" sizes="80px" />}</Link>
              <div className="min-w-0 flex-1">
                <Link href={`/p/${i.product.slug}`} className="font-medium hover:text-gold-text">{i.title}</Link>
                <p className="text-xs text-slate">{i.variantTitle} × {i.quantity} · {formatPrice(i.unitPrice * i.quantity)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {delivered && !i.review && <ReviewDialog orderItemId={i.id} title={i.title} apparel={i.product.tryOnType !== "NONE"} size={i.variantTitle.split(" / ").pop() ?? ""} />}
                  {i.review && <span className="text-xs font-medium text-emerald">✓ Reviewed — thank you</span>}
                  {withinWindow && !i.returns.length && <ReturnDialog orderItemId={i.id} title={i.title} />}
                  {i.returns[0] && <StatusPill status={i.returns[0].status} />}
                </div>
              </div>
            </div>

            {i.status === "CANCELLED" ? (
              <p className="mt-4 text-sm text-crimson">This item was cancelled. Any payment will be refunded to the original method.</p>
            ) : (
              <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Delivery progress">
                {STEPS.map((s, idx) => (
                  <li key={s} className="text-center">
                    <div className={cn("mx-auto grid size-7 place-items-center rounded-full border-2 text-xs", idx <= step ? "border-emerald bg-emerald text-white" : "border-sand text-slate")}>{idx <= step ? <Check className="size-3.5" /> : idx + 1}</div>
                    <div className={cn("mt-1 h-1 rounded-full", idx <= step ? "bg-emerald" : "bg-sand")} />
                    <p className={cn("mt-1 text-[11px] capitalize", idx <= step ? "font-semibold" : "text-slate")} aria-current={idx === step ? "step" : undefined}>
                      {s.toLowerCase()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {i.shipment && (
              <div className="mt-4 rounded-md bg-sand-50 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Truck className="size-4 text-gold-text" aria-hidden /> {i.shipment.carrier} · {i.shipment.trackingNumber}
                </p>
                {i.shipment.estimatedDelivery && <p className="text-xs text-slate">Estimated delivery {formatDate(i.shipment.estimatedDelivery)}</p>}
                <ul className="mt-2 space-y-1 text-xs">
                  {events
                    .slice()
                    .reverse()
                    .map((e, k) => (
                      <li key={k}>
                        <span className="text-slate">{formatDate(e.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> — {e.status}
                        {e.location ? `, ${e.location}` : ""}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </article>
        );
      })}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[8px] border border-sand bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold">Delivery address</h2>
          <p>{addr.fullName}</p>
          <p className="text-slate">
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.region} {addr.postalCode}
          </p>
          {addr.phone && <p className="text-slate">{addr.phone}</p>}
        </div>
        <dl className="space-y-1 rounded-[8px] border border-sand bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold">Payment summary</h2>
          <div className="flex justify-between"><dt className="text-slate">Items</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate">Delivery</dt><dd>{order.shippingTotal ? formatPrice(order.shippingTotal) : "FREE"}</dd></div>
          {order.discountTotal > 0 && <div className="flex justify-between text-crimson"><dt>Discount</dt><dd>−{formatPrice(order.discountTotal)}</dd></div>}
          <div className="flex justify-between border-t border-sand pt-1 font-semibold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
