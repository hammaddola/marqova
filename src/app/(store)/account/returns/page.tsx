import { RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { EmptyState } from "@/components/ui/primitives";
import { StatusPill } from "@/components/account/status-pill";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Returns & refunds" };

export default async function ReturnsPage() {
  const user = await requireUser("/account/returns");
  const returns = await db.return.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { orderItem: { select: { title: true, variantTitle: true, order: { select: { number: true } } } } } });
  return (
    <div>
      <h1 className="heading-display mb-2 text-3xl">Returns & refunds</h1>
      <p className="mb-6 text-sm text-slate">Start a return from any delivered order. Refunds go back to your original payment method within 5 business days of the seller receiving the item.</p>
      {!returns.length && <EmptyState icon={<RotateCcw />} title="No returns" body="Returns you request will appear here with their status." />}
      <ul className="space-y-3">
        {returns.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-[8px] border border-sand bg-white p-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.orderItem.title}</p>
              <p className="text-xs text-slate">
                {r.orderItem.variantTitle} · Order {r.orderItem.order.number} · {r.reason} · Requested {formatDate(r.createdAt)}
              </p>
              {r.resolution && <p className="mt-1 text-xs">Seller: {r.resolution}</p>}
            </div>
            {r.refundAmount != null && <span className="font-semibold">{formatPrice(r.refundAmount)}</span>}
            <StatusPill status={r.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
