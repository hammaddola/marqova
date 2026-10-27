import Link from "next/link";
import { Bell, Heart, Package, Ruler } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { Card, SectionHeading } from "@/components/ui/primitives";
import { Stagger, StaggerItem } from "@/components/motion";
import { formatDate, formatPrice } from "@/lib/utils";
import { StatusPill } from "@/components/account/status-pill";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser();
  const [orders, wish, alerts, avatars, notifications] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.wishlist.count({ where: { userId: user.id } }),
    db.priceAlert.count({ where: { userId: user.id, active: true } }),
    db.avatarProfile.count({ where: { userId: user.id } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const tiles = [
    { href: "/account/orders", label: "Orders", value: orders.length ? "View all" : "None yet", icon: Package },
    { href: "/account/wishlist", label: "Wishlist", value: `${wish} saved`, icon: Heart },
    { href: "/account/alerts", label: "Price alerts", value: `${alerts} active`, icon: Bell },
    { href: "/account/avatars", label: "Avatars", value: `${avatars} saved`, icon: Ruler },
  ];
  return (
    <div className="space-y-10">
      <h1 className="heading-display text-3xl">Your account</h1>
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <StaggerItem key={t.href}>
            <Link href={t.href} className="flex h-full flex-col gap-2 rounded-[8px] border border-sand bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-gold-500">
              <t.icon className="size-5 text-gold-text" aria-hidden />
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-xs text-slate">{t.value}</span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <section>
        <SectionHeading title="Recent orders" action={<Link href="/account/orders" className="text-sm font-semibold text-gold-text hover:underline">All orders</Link>} />
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between rounded-[8px] border border-sand bg-white p-4 text-sm hover:border-gold-500">
              <span>
                <span className="font-semibold">{o.number}</span>
                <span className="block text-xs text-slate">{formatDate(o.createdAt)}</span>
              </span>
              <StatusPill status={o.status} />
              <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
            </Link>
          ))}
          {!orders.length && <p className="text-sm text-slate">No orders yet.</p>}
        </div>
      </section>
      <section>
        <SectionHeading title="Notifications" />
        <Card className="divide-y divide-sand">
          {notifications.map((n) => (
            <div key={n.id} className="p-4 text-sm">
              <p className="font-semibold">{n.title}</p>
              <p className="text-slate">{n.body}</p>
              {n.href && <Link href={n.href} className="text-xs font-semibold text-gold-text hover:underline">View</Link>}
            </div>
          ))}
          {!notifications.length && <p className="p-4 text-sm text-slate">You&apos;re all caught up.</p>}
        </Card>
      </section>
    </div>
  );
}
