import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { resolveDispute } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusPill } from "@/components/account/status-pill";
import { EmptyState } from "@/components/ui/primitives";
import { formatDate, formatPrice } from "@/lib/utils";
import { hoursAgo } from "@/lib/time";

export const metadata = { title: "Disputes & refunds" };

export default async function DisputesPage() {
  await requireRole(["ADMIN"]);
  const stale = hoursAgo(48);
  // Disputes: seller-rejected returns, explicitly disputed returns, and requests the seller ignored for 48h.
  const rows = await db.return.findMany({
    where: {
      OR: [{ status: { in: ["REJECTED", "DISPUTED"] } }, { status: "REQUESTED", createdAt: { lt: stale } }],
      NOT: { resolution: { startsWith: "Marqova:" } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { orderItem: { include: { store: { select: { name: true } }, order: { select: { number: true } } } }, user: { select: { name: true, email: true } } },
  });
  return (
    <div>
      <PageHeader title="Disputes & refunds" subtitle="Buyer Protection: Marqova decides when a seller rejects a return or doesn't respond within 48 hours." />
      {!rows.length && <EmptyState title="No open disputes" body="Escalated returns appear here." />}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[8px] border border-sand bg-white p-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{r.orderItem.title}</span>
              <StatusPill status={r.status === "REQUESTED" ? "DISPUTED" : r.status} />
              <span className="ml-auto font-semibold">{r.refundAmount != null && formatPrice(r.refundAmount)}</span>
            </div>
            <p className="mt-1 text-xs text-slate">Order {r.orderItem.order.number} · seller {r.orderItem.store.name} · buyer {r.user.name} ({r.user.email}) · opened {formatDate(r.createdAt)}</p>
            <p className="mt-2"><strong>Buyer:</strong> {r.reason}{r.details ? ` — ${r.details}` : ""}</p>
            {r.resolution && <p className="mt-1"><strong>Seller:</strong> {r.resolution}</p>}
            <div className="mt-3 flex gap-2">
              <ActionButton size="sm" variant="gold" action={resolveDispute.bind(null, r.id, "REFUNDED", "Refund approved under Buyer Protection.")}>Refund buyer</ActionButton>
              <ActionButton size="sm" variant="secondary" action={resolveDispute.bind(null, r.id, "REJECTED", "Seller decision upheld after review.")}>Uphold seller</ActionButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
