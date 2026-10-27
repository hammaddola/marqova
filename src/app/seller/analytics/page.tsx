import Link from "next/link";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { Card, StatCard } from "@/components/ui/primitives";
import { FunnelChart, SalesChart, SourcesChart } from "@/components/seller/charts";
import { formatPrice, cn } from "@/lib/utils";
import { daysAgo } from "@/lib/time";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: PageProps<"/seller/analytics">) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const days = sp.range === "7" ? 7 : sp.range === "90" ? 90 : 30;
  const since = daysAgo(days);
  const where = { product: { storeId: store.id }, date: { gte: since } };
  const [daily, rows, top] = await Promise.all([
    db.productDailyStat.groupBy({ by: ["date"], where, _sum: { views: true, addToCarts: true, orders: true, revenue: true }, orderBy: { date: "asc" } }),
    db.productDailyStat.findMany({ where, select: { sources: true } }),
    db.productDailyStat.groupBy({ by: ["productId"], where, _sum: { revenue: true, orders: true, views: true }, orderBy: { _sum: { revenue: "desc" } }, take: 10 }),
  ]);
  const titles = new Map((await db.product.findMany({ where: { id: { in: top.map((t) => t.productId) } }, select: { id: true, title: true } })).map((p) => [p.id, p.title]));
  const sources: Record<string, number> = {};
  for (const r of rows) for (const [k, v] of Object.entries((r.sources ?? {}) as Record<string, number>)) sources[k] = (sources[k] ?? 0) + v;
  const sum = (k: "views" | "addToCarts" | "orders" | "revenue") => daily.reduce((s, d) => s + (d._sum[k] ?? 0), 0);
  const views = sum("views");
  const orders = sum("orders");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Last ${days} days`}
        actions={
          <nav className="flex gap-1 text-sm" aria-label="Date range">
            {["7", "30", "90"].map((r) => (
              <Link key={r} href={`/seller/analytics?range=${r}`} aria-current={String(days) === r ? "page" : undefined} className={cn("rounded-full px-3 py-1.5", String(days) === r ? "bg-navy-900 text-white" : "bg-white ring-1 ring-sand")}>
                {r}d
              </Link>
            ))}
          </nav>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Sales" value={formatPrice(sum("revenue"))} />
        <StatCard label="Orders" value={orders.toLocaleString()} />
        <StatCard label="Views" value={views.toLocaleString()} />
        <StatCard label="Add-to-cart rate" value={`${views ? ((sum("addToCarts") / views) * 100).toFixed(1) : 0}%`} />
        <StatCard label="Conversion" value={`${views ? ((orders / views) * 100).toFixed(2) : 0}%`} />
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Sales</h2>
        <SalesChart data={daily.map((d) => ({ date: d.date.toISOString(), revenue: (d._sum.revenue ?? 0) / 100, orders: d._sum.orders ?? 0 }))} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Funnel</h2>
          <FunnelChart data={daily.map((d) => ({ date: d.date.toISOString(), views: d._sum.views ?? 0, addToCarts: d._sum.addToCarts ?? 0, orders: d._sum.orders ?? 0 }))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Traffic sources</h2>
          <SourcesChart data={Object.entries(sources).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))} />
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Top products</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate uppercase">
            <tr><th scope="col" className="py-2">Product</th><th scope="col" className="py-2 text-right">Views</th><th scope="col" className="py-2 text-right">Orders</th><th scope="col" className="py-2 text-right">Conversion</th><th scope="col" className="py-2 text-right">Sales</th></tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {top.map((t) => (
              <tr key={t.productId}>
                <td className="py-2"><Link href={`/seller/listings/${t.productId}`} className="hover:text-gold-text">{titles.get(t.productId)}</Link></td>
                <td className="py-2 text-right tabular-nums">{(t._sum.views ?? 0).toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{t._sum.orders ?? 0}</td>
                <td className="py-2 text-right tabular-nums">{t._sum.views ? (((t._sum.orders ?? 0) / t._sum.views) * 100).toFixed(1) : 0}%</td>
                <td className="py-2 text-right tabular-nums">{formatPrice(t._sum.revenue ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
