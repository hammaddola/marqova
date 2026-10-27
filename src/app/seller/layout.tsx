import type { Metadata } from "next";
import { ConsoleShell } from "@/components/layout/console-shell";
import { db } from "@/lib/db";
import { getSellerContext, requireUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "Seller Hub", template: "%s · Seller Hub" }, robots: { index: false } };

export default async function SellerLayout({ children }: LayoutProps<"/seller">) {
  const user = await requireUser("/seller");
  const ctx = await getSellerContext();
  const approved = ctx?.profile?.status === "APPROVED" && ctx.store;
  const [pendingOrders, openReturns, lowStock] = approved
    ? await Promise.all([
        db.order.count({ where: { status: { in: ["PLACED", "CONFIRMED"] }, items: { some: { storeId: ctx.store!.id, status: { in: ["PENDING", "ACCEPTED", "PACKED"] } } } } }),
        db.return.count({ where: { status: "REQUESTED", orderItem: { storeId: ctx.store!.id } } }),
        db.productVariant.count({ where: { product: { storeId: ctx.store!.id, status: "ACTIVE" }, isActive: true, stock: { lte: 3 } } }),
      ])
    : [0, 0, 0];
  const items = approved
    ? [
        { href: "/seller", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/seller/listings", label: "Listings", icon: "Boxes" },
        { href: "/seller/listings/new", label: "Add product", icon: "PlusSquare" },
        { href: "/seller/listings/ai", label: "List from a photo", icon: "Sparkles" },
        { href: "/seller/bulk", label: "Bulk upload", icon: "Upload" },
        { href: "/seller/inventory", label: "Inventory", icon: "Warehouse", badge: lowStock },
        { href: "/seller/orders", label: "Orders", icon: "ShoppingBag", badge: pendingOrders },
        { href: "/seller/returns", label: "Returns", icon: "RotateCcw", badge: openReturns },
        { href: "/seller/messages", label: "Messages", icon: "MessageSquare" },
        { href: "/seller/promotions", label: "Promotions", icon: "Megaphone" },
        { href: "/seller/analytics", label: "Analytics", icon: "BarChart3" },
        { href: "/seller/payouts", label: "Payouts & fees", icon: "Wallet" },
        { href: "/seller/api", label: "Seller API", icon: "KeyRound" },
      ]
    : [{ href: "/seller/onboarding", label: "Onboarding", icon: "BadgeCheck" }];
  return (
    <ConsoleShell area="Seller Hub" user={ctx?.store?.name ?? user.name ?? ""} items={items}>
      {children}
    </ConsoleShell>
  );
}
