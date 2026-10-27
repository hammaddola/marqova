import Link from "next/link";
import { Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { advanceOrderItems } from "@/server/actions/seller";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/account/status-pill";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate, formatPrice, cn } from "@/lib/utils";

export const metadata = { title: "Orders" };

const TABS = { open: ["PENDING", "ACCEPTED", "PACKED"], shipped: ["SHIPPED"], done: ["DELIVERED", "RETURNED", "CANCELLED"] } as const;

export default async function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" && sp.tab in TABS ? sp.tab : "open") as keyof typeof TABS;
  const orders = await db.order.findMany({
    where: { status: { not: "PENDING_PAYMENT" }, items: { some: { storeId: store.id, status: { in: [...TABS[tab]] } } } },
    orderBy: { createdAt: tab === "open" ? "asc" : "desc" },
    take: 50,
    include: { items: { where: { storeId: store.id } }, shipments: { where: { storeId: store.id } } },
  });

  return (
    <div>
      <PageHeader title="Orders" subtitle="Accept → pack → print label → ship. Oldest open orders first, so nothing waits too long." />
      <nav className="mb-4 flex gap-2 text-sm" aria-label="Order status">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
          <Link key={t} href={`/seller/orders?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 capitalize", tab === t ? "bg-navy-900 font-semibold text-white" : "bg-white ring-1 ring-sand")}>
            {t === "done" ? "Completed" : t}
          </Link>
        ))}
      </nav>
      {!orders.length && <EmptyState title="Nothing here" body={tab === "open" ? "No orders waiting. New orders appear here and in your notifications." : "No orders in this state yet."} />}
      <div className="space-y-3">
        {orders.map((o) => {
          const status = o.items[0].status;
          const addr = o.shippingAddress as Record<string, string>;
          const total = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
          return (
            <article key={o.id} className="rounded-[8px] border border-sand bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{o.number}</span>
                <StatusPill status={status} />
                {o.paymentMethod === "cod" && <span className="rounded bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-text">Cash on delivery</span>}
                <span className="text-xs text-slate">{formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="ml-auto font-semibold tabular-nums">{formatPrice(total)}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span className="truncate">{i.quantity} × {i.title} <span className="text-slate">({i.variantTitle})</span></span>
                    <span className="text-xs text-slate">{formatPrice(i.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate">Ship to {addr.fullName}, {addr.city}{o.deliveryOption === "express" ? " · EXPRESS" : ""}</p>
              {o.shipments[0] && <p className="mt-1 text-xs">Tracking: <span className="font-mono">{o.shipments[0].trackingNumber}</span></p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {status === "PENDING" && (
                  <>
                    <ActionButton size="sm" variant="gold" action={advanceOrderItems.bind(null, o.id, "ACCEPTED")}>Accept order</ActionButton>
                    <ActionButton size="sm" variant="ghost" confirm="Cancel this order? Stock will be restocked and the buyer refunded." action={advanceOrderItems.bind(null, o.id, "CANCELLED")}>Cancel</ActionButton>
                  </>
                )}
                {status === "ACCEPTED" && <ActionButton size="sm" variant="navy" action={advanceOrderItems.bind(null, o.id, "PACKED")}>Mark packed</ActionButton>}
                {(status === "PACKED" || status === "ACCEPTED") && (
                  <>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/seller/orders/${o.id}/label`} target="_blank"><Printer /> Print shipping label</Link>
                    </Button>
                    {status === "PACKED" && <ActionButton size="sm" variant="gold" action={advanceOrderItems.bind(null, o.id, "SHIPPED")}>Mark shipped</ActionButton>}
                  </>
                )}
                {status === "SHIPPED" && <ActionButton size="sm" variant="secondary" action={advanceOrderItems.bind(null, o.id, "DELIVERED")}>Confirm delivered (courier)</ActionButton>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
