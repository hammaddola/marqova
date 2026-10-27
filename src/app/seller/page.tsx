import Link from "next/link";
import { AlertTriangle, ArrowRight, Lightbulb, PlusSquare, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { Card, StatCard } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/account/status-pill";
import { TrustBadge } from "@/components/product/trust-badge";
import { SalesChart } from "@/components/seller/charts";
import { formatDate, formatPrice } from "@/lib/utils";
import { daysAgo } from "@/lib/time";

export const metadata = { title: "Dashboard" };

export default async function SellerDashboard() {
  const { store } = await requireSeller();
  const since = daysAgo(30);
  const prev = daysAgo(60);
  const [stats, prevStats, orders, lowStock, attention, trust, daily] = await Promise.all([
    db.productDailyStat.aggregate({ where: { product: { storeId: store.id }, date: { gte: since } }, _sum: { views: true, orders: true, revenue: true, addToCarts: true } }),
    db.productDailyStat.aggregate({ where: { product: { storeId: store.id }, date: { gte: prev, lt: since } }, _sum: { revenue: true } }),
    db.order.findMany({ where: { items: { some: { storeId: store.id } }, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 6, include: { items: { where: { storeId: store.id } } } }),
    db.productVariant.findMany({ where: { product: { storeId: store.id, status: "ACTIVE" }, isActive: true, stock: { lte: 3 } }, take: 6, include: { product: { select: { title: true, id: true } } } }),
    db.product.findMany({ where: { storeId: store.id, OR: [{ status: "NEEDS_ATTENTION" }, { qualityScore: { lt: 60 } }] }, take: 5, select: { id: true, title: true, status: true, qualityScore: true, moderationNote: true } }),
    db.trustScore.findUnique({ where: { storeId: store.id } }),
    db.productDailyStat.groupBy({ by: ["date"], where: { product: { storeId: store.id }, date: { gte: since } }, _sum: { revenue: true, orders: true, views: true }, orderBy: { date: "asc" } }),
  ]);
  const views = stats._sum.views ?? 0;
  const ordersCount = stats._sum.orders ?? 0;
  const revenue = stats._sum.revenue ?? 0;
  const prevRevenue = prevStats._sum.revenue ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={store.name}
        subtitle="Last 30 days"
        actions={
          <>
            <Button asChild variant="secondary" size="sm"><Link href="/seller/listings/ai"><Sparkles /> List from a photo</Link></Button>
            <Button asChild variant="gold" size="sm"><Link href="/seller/listings/new"><PlusSquare /> Add product</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales" value={formatPrice(revenue)} trend={prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : undefined} hint="vs previous 30 days" />
        <StatCard label="Orders" value={ordersCount.toLocaleString()} />
        <StatCard label="Product views" value={views.toLocaleString()} />
        <StatCard label="Conversion" value={`${views ? ((ordersCount / views) * 100).toFixed(2) : "0.00"}%`} hint="orders ÷ views" />
      </div>
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Daily sales</h2>
          {trust && <TrustBadge score={trust.score} inputs={trust} />}
        </div>
        <SalesChart data={daily.map((d) => ({ date: d.date.toISOString(), revenue: (d._sum.revenue ?? 0) / 100, orders: d._sum.orders ?? 0 }))} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/seller/orders" className="flex items-center gap-1 text-xs font-semibold text-gold-text hover:underline">All orders <ArrowRight className="size-3" /></Link>
          </div>
          <ul className="divide-y divide-sand text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{o.number}</span>
                  <span className="block text-xs text-slate">{formatDate(o.createdAt)} · {o.items.length} item(s)</span>
                </span>
                <StatusPill status={o.items[0]?.status ?? o.status} />
                <span className="tabular-nums">{formatPrice(o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
              </li>
            ))}
            {!orders.length && <li className="py-3 text-slate">No orders yet.</li>}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber" aria-hidden /> Low stock</h2>
            <ul className="space-y-1.5 text-sm">
              {lowStock.map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <Link href={`/seller/listings/${v.product.id}`} className="truncate hover:text-gold-text">{v.product.title} · {v.title}</Link>
                  <span className={v.stock === 0 ? "font-semibold text-crimson" : "font-semibold text-amber"}>{v.stock} left</span>
                </li>
              ))}
              {!lowStock.length && <li className="text-slate">All variants are well stocked.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-gold-text" aria-hidden /> Improve your listings</h2>
            <ul className="space-y-2 text-sm">
              {attention.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <Link href={`/seller/listings/${p.id}`} className="truncate hover:text-gold-text">{p.title}</Link>
                  <span className="shrink-0 text-xs text-slate">Quality {p.qualityScore}/100</span>
                </li>
              ))}
              {!attention.length && <li className="text-slate">Every listing is in good shape.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
