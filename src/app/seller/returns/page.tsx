import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { decideReturn } from "@/server/actions/seller";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Returns" };

export default async function SellerReturnsPage() {
  const { store } = await requireSeller();
  const returns = await db.return.findMany({
    where: { orderItem: { storeId: store.id } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
    include: { orderItem: { include: { order: { select: { number: true } } } }, user: { select: { name: true } } },
  });
  return (
    <div>
      <PageHeader title="Returns" subtitle="Respond within 2 business days — slow responses lower your Trust Score, and Marqova steps in after 48 hours." />
      {!returns.length && <EmptyState title="No returns" body="Return requests from buyers appear here." />}
      <ul className="space-y-3">
        {returns.map((r) => (
          <li key={r.id} className="rounded-[8px] border border-sand bg-white p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{r.orderItem.title}</span>
              <StatusPill status={r.status} />
              <span className="ml-auto font-semibold">{r.refundAmount != null && formatPrice(r.refundAmount)}</span>
            </div>
            <p className="mt-1 text-xs text-slate">
              Order {r.orderItem.order.number} · {r.orderItem.variantTitle} · {r.user.name} · {formatDate(r.createdAt)}
            </p>
            <p className="mt-2"><strong>{r.reason}</strong>{r.details ? ` — ${r.details}` : ""}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "REQUESTED" && (
                <>
                  <ActionButton size="sm" variant="gold" action={decideReturn.bind(null, r.id, "APPROVED", "Please send the item back using the prepaid label.")}>Approve</ActionButton>
                  <ActionButton size="sm" variant="ghost" confirm="Reject this return? The buyer can escalate to Marqova." action={decideReturn.bind(null, r.id, "REJECTED", "Item is outside our return conditions.")}>Reject</ActionButton>
                </>
              )}
              {r.status === "APPROVED" && <ActionButton size="sm" variant="navy" action={decideReturn.bind(null, r.id, "REFUNDED", "Item received, refund issued.")}>Item received — refund</ActionButton>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
