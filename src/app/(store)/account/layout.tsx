import { requireUser } from "@/server/session";
import { SideNav } from "@/components/layout/side-nav";

const NAV = [
  { href: "/account", label: "Overview", icon: "LayoutDashboard" },
  { href: "/account/orders", label: "Orders & tracking", icon: "Package" },
  { href: "/account/returns", label: "Returns & refunds", icon: "RotateCcw" },
  { href: "/account/wishlist", label: "Wishlist", icon: "Heart" },
  { href: "/account/alerts", label: "Price alerts", icon: "Bell" },
  { href: "/account/avatars", label: "Sizes & avatars", icon: "Ruler" },
  { href: "/account/addresses", label: "Addresses", icon: "MapPin" },
  { href: "/account/messages", label: "Messages", icon: "MessageSquare" },
];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser("/account");
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
      <SideNav title={`Hi, ${user.name?.split(" ")[0] ?? "there"}`} items={NAV} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
