import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { deletePriceAlert } from "@/server/actions/shopper";
import { EmptyState } from "@/components/ui/primitives";
import { ActionButton } from "@/components/ui/action-button";
import { ProductImage } from "@/components/brand";
import { StatusPill } from "@/components/account/status-pill";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Price alerts" };

export default async function AlertsPage() {
  const user = await requireUser("/account/alerts");
  const alerts = await db.priceAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { slug: true, title: true, basePrice: true, media: { where: { type: "IMAGE" }, take: 1, select: { url: true } } } } },
  });
  return (
    <div>
      <h1 className="heading-display mb-2 text-3xl">Price alerts</h1>
      <p className="mb-6 text-sm text-slate">We check prices whenever a seller changes them and email you when your target is reached.</p>
      {!alerts.length && <EmptyState icon={<Bell />} title="No price alerts" body="Open any product and choose “Set a price alert” under the price history chart." />}
      <ul className="space-y-3">
        {alerts.map((a) => {
          const hit = a.product.basePrice <= a.targetPrice;
          return (
            <li key={a.id} className="flex items-center gap-4 rounded-[8px] border border-sand bg-white p-4">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-sand-50">{a.product.media[0] && <ProductImage src={a.product.media[0].url} alt="" sizes="56px" />}</span>
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/p/${a.product.slug}`} className="line-clamp-1 font-medium hover:text-gold-text">{a.product.title}</Link>
                <p className="text-xs text-slate">
                  Now {formatPrice(a.product.basePrice)} · Target {formatPrice(a.targetPrice)}
                </p>
              </div>
              <StatusPill status={hit || !a.active ? "COMPLETED" : "ACTIVE"} />
              <ActionButton variant="ghost" size="iconSm" aria-label="Delete alert" action={deletePriceAlert.bind(null, a.id)} successMessage="Alert deleted">
                <Trash2 />
              </ActionButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
