import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { calculateFees } from "@/lib/fees";
import { PageHeader } from "@/components/layout/console-shell";
import { Card, StatCard } from "@/components/ui/primitives";
import { StatusPill } from "@/components/account/status-pill";
import { FeeCalculator } from "@/components/seller/fee-calculator";
import { formatDate, formatPrice } from "@/lib/utils";
import { daysAgo } from "@/lib/time";

export const metadata = { title: "Payouts & fees" };

export default async function PayoutsPage() {
  const { store, profile } = await requireSeller();
  const [payouts, unpaid, categories] = await Promise.all([
    db.payout.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.orderItem.findMany({
      where: { storeId: store.id, status: "DELIVERED", deliveredAt: { gte: daysAgo(7) } },
      include: { product: { select: { category: { select: { commissionBps: true, parent: { select: { commissionBps: true } } } } } } },
    }),
    db.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true, commissionBps: true } }),
  ]);
  const breakdown = unpaid.reduce(
    (acc, i) => {
      const f = calculateFees({ salePrice: i.unitPrice, quantity: i.quantity, commissionBps: i.product.category.commissionBps });
      acc.gross += f.gross;
      acc.commission += f.commission;
      acc.fixed += f.fixed;
      acc.payment += f.payment;
      acc.net += f.net;
      return acc;
    },
    { gross: 0, commission: 0, fixed: 0, payment: 0, net: 0 },
  );
  const paid = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts & fees" subtitle={`Weekly payouts to ${profile.bankName} ••••${profile.bankAccountLast4}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Available next payout" value={formatPrice(breakdown.net)} hint="delivered in the last 7 days" />
        <StatCard label="Gross sales (period)" value={formatPrice(breakdown.gross)} />
        <StatCard label="Fees (period)" value={formatPrice(breakdown.commission + breakdown.fixed + breakdown.payment)} />
        <StatCard label="Paid out (all time)" value={formatPrice(paid)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Fee breakdown — current period</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Gross sales", breakdown.gross],
              ["Category commission", -breakdown.commission],
              ["Fixed fee per item", -breakdown.fixed],
              ["Payment processing (2%)", -breakdown.payment],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-slate">{k}</dt>
                <dd className="tabular-nums">{(v as number) < 0 ? `−${formatPrice(-(v as number))}` : formatPrice(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-sand pt-2 font-semibold">
              <dt>Net payout</dt>
              <dd className="tabular-nums">{formatPrice(breakdown.net)}</dd>
            </div>
          </dl>
        </Card>
        <FeeCalculator categories={categories} />
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Payout history</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-slate uppercase">
              <tr><th scope="col" className="py-2">Period</th><th scope="col" className="py-2 text-right">Gross</th><th scope="col" className="py-2 text-right">Fees</th><th scope="col" className="py-2 text-right">Net</th><th scope="col" className="py-2">Status</th><th scope="col" className="py-2">Reference</th></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{formatDate(p.periodStart, { day: "numeric", month: "short" })} – {formatDate(p.periodEnd, { day: "numeric", month: "short" })}</td>
                  <td className="py-2 text-right tabular-nums">{formatPrice(p.gross)}</td>
                  <td className="py-2 text-right tabular-nums">−{formatPrice(p.fees)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatPrice(p.net)}</td>
                  <td className="py-2"><StatusPill status={p.status} /></td>
                  <td className="py-2 font-mono text-xs">{p.reference}</td>
                </tr>
              ))}
              {!payouts.length && <tr><td colSpan={6} className="py-4 text-center text-slate">Your first payout appears after your first delivered order.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
