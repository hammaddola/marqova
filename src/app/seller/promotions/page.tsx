import { Pause, Play } from "lucide-react";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { toggleCampaign } from "@/server/actions/seller";
import { PageHeader } from "@/components/layout/console-shell";
import { Card } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { CampaignForm, CouponForm, DealForm } from "@/components/seller/promotion-forms";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  const { store } = await requireSeller();
  const [coupons, deals, campaigns, products] = await Promise.all([
    db.coupon.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } }),
    db.promotion.findMany({ where: { storeId: store.id }, orderBy: { endsAt: "desc" }, take: 20, include: { product: { select: { title: true } } } }),
    db.sponsoredCampaign.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { title: true } } } }),
    db.product.findMany({ where: { storeId: store.id, status: "ACTIVE" }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  const now = new Date();
  return (
    <div className="space-y-8">
      <PageHeader title="Promotions" subtitle="Coupons, flash deals and sponsored listings. Sponsored results are always labelled and capped at 2 per search page." />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">New coupon</h2>
          <CouponForm />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">New flash deal</h2>
          <DealForm products={products} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Sponsor a listing (CPC)</h2>
          <CampaignForm products={products} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Sponsored campaigns</h2>
        <div className="overflow-x-auto rounded-[8px] border border-sand bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-sand-50 text-left text-xs text-slate uppercase">
              <tr><th scope="col" className="p-3">Listing</th><th scope="col" className="p-3">Bid</th><th scope="col" className="p-3">Daily budget</th><th scope="col" className="p-3">Impressions</th><th scope="col" className="p-3">Clicks (CTR)</th><th scope="col" className="p-3">Spent</th><th scope="col" className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="p-3">{c.product.title}</td>
                  <td className="p-3">{formatPrice(c.cpcBid)}</td>
                  <td className="p-3">{formatPrice(c.dailyBudget)}</td>
                  <td className="p-3 tabular-nums">{c.impressions.toLocaleString()}</td>
                  <td className="p-3 tabular-nums">{c.clicks} ({c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0}%)</td>
                  <td className="p-3">{formatPrice(c.totalSpent)}</td>
                  <td className="p-3 text-right">
                    <ActionButton size="sm" variant="ghost" action={toggleCampaign.bind(null, c.id)}>{c.active ? <><Pause /> Pause</> : <><Play /> Resume</>}</ActionButton>
                  </td>
                </tr>
              ))}
              {!campaigns.length && <tr><td colSpan={7} className="p-6 text-center text-slate">No campaigns yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Coupons</h2>
          <ul className="divide-y divide-sand text-sm">
            {coupons.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="font-mono font-semibold">{c.code}</span>
                <span className="text-xs text-slate">{c.type === "PERCENT" ? `${c.value}% off` : c.type === "FIXED" ? `${formatPrice(c.value)} off` : "Free delivery"}{c.minSubtotal ? ` over ${formatPrice(c.minSubtotal)}` : ""}</span>
                <span className="text-xs">{c.usedCount} used</span>
                <StatusPill status={c.active && (!c.endsAt || c.endsAt > now) ? "ACTIVE" : "INACTIVE"} />
              </li>
            ))}
            {!coupons.length && <li className="py-2 text-slate">No coupons yet.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Flash deals</h2>
          <ul className="divide-y divide-sand text-sm">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{d.product.title}</span>
                <span className="text-xs font-semibold text-crimson">-{d.discountPercent}%</span>
                <span className="text-xs text-slate">ends {formatDate(d.endsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <StatusPill status={d.endsAt > now ? "ACTIVE" : "COMPLETED"} />
              </li>
            ))}
            {!deals.length && <li className="py-2 text-slate">No deals yet.</li>}
          </ul>
        </Card>
      </section>
    </div>
  );
}
