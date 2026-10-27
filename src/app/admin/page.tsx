import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { Card, StatCard } from "@/components/ui/primitives";
import { SalesChart } from "@/components/seller/charts";
import { formatPrice, formatDate } from "@/lib/utils";
import { daysAgo } from "@/lib/time";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  await requireRole(["ADMIN"]);
  const since = daysAgo(30);
  const [gmv, orders, users, sellers, products, daily, byCategory, audit] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: since }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } }, _sum: { total: true } }),
    db.order.count({ where: { createdAt: { gte: since }, status: { notIn: ["PENDING_PAYMENT", "CANCELLED"] } } }),
    db.user.count(),
    db.sellerProfile.count({ where: { status: "APPROVED" } }),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.productDailyStat.groupBy({ by: ["date"], where: { date: { gte: since } }, _sum: { revenue: true, orders: true }, orderBy: { date: "asc" } }),
    db.$queryRaw<{ name: string; revenue: bigint; items: bigint }[]>`
      SELECT COALESCE(parent.name, c.name) AS name, SUM(oi."unitPrice" * oi.quantity) AS revenue, SUM(oi.quantity) AS items
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Category" parent ON parent.id = c."parentId"
      WHERE oi."createdAt" >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { name: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Marketplace overview" subtitle="Last 30 days · sample data in development" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="GMV" value={formatPrice(gmv._sum.total ?? 0)} />
        <StatCard label="Orders" value={orders.toLocaleString()} />
        <StatCard label="Active listings" value={products.toLocaleString()} />
        <StatCard label="Verified sellers" value={sellers.toLocaleString()} />
        <StatCard label="Users" value={users.toLocaleString()} />
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Platform sales (tracked)</h2>
        <SalesChart data={daily.map((d) => ({ date: d.date.toISOString(), revenue: (d._sum.revenue ?? 0) / 100, orders: d._sum.orders ?? 0 }))} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Top categories</h2>
          <ul className="space-y-2 text-sm">
            {byCategory.map((c) => {
              const max = Number(byCategory[0]?.revenue ?? 1);
              return (
                <li key={c.name}>
                  <div className="flex justify-between"><span>{c.name}</span><span className="tabular-nums">{formatPrice(Number(c.revenue))}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-sand-50"><div className="h-full rounded-full bg-gold-500" style={{ width: `${(Number(c.revenue) / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Audit log</h2>
          <ul className="divide-y divide-sand text-xs">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span><span className="font-semibold">{a.actor?.name ?? "system"}</span> · {a.action} · {a.entityType}</span>
                <span className="shrink-0 text-slate">{formatDate(a.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
            {!audit.length && <li className="py-2 text-slate">No admin activity yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
