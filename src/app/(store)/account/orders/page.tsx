import Link from "next/link";
import { Package } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/brand";
import { StatusPill } from "@/components/account/status-pill";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Your orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const user = await requireUser("/account/orders");
  const sp = await searchParams;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 11,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { items: true },
  });
  const next = orders.length > 10 ? orders[9].id : null;

  return (
    <div>
      <h1 className="heading-display mb-6 text-3xl">Orders & tracking</h1>
      {!orders.length && <EmptyState icon={<Package />} title="No orders yet" body="When you place an order, you can track it here." action={<Button asChild variant="gold"><Link href="/search">Start shopping</Link></Button>} />}
      <div className="space-y-4">
        {orders.slice(0, 10).map((o) => (
          <article key={o.id} className="overflow-hidden rounded-[8px] border border-sand bg-white">
            <header className="flex flex-wrap items-center gap-x-8 gap-y-2 bg-sand-50 px-5 py-3 text-xs">
              <span>
                <span className="block text-slate uppercase">Order placed</span>
                {formatDate(o.createdAt)}
              </span>
              <span>
                <span className="block text-slate uppercase">Total</span>
                {formatPrice(o.total)}
              </span>
              <span className="ml-auto">
                <span className="block text-slate uppercase">{o.isSample ? "Preview order" : "Order"}</span>
                {o.number}
              </span>
              <Link href={`/account/orders/${o.id}`} className="font-semibold text-gold-text hover:underline">
                Details & tracking
              </Link>
            </header>
            <ul className="divide-y divide-sand">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 p-5">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-sand-50">{i.imageUrl && <ProductImage src={i.imageUrl} alt="" sizes="64px" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.title}</span>
                    <span className="text-xs text-slate">{i.variantTitle} × {i.quantity}</span>
                  </span>
                  <StatusPill status={i.status} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      {next && (
        <div className="mt-6 text-center">
          <Button asChild variant="secondary">
            <Link href={`/account/orders?cursor=${next}`}>Older orders</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
