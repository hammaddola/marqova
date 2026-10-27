import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { MapPin, Package } from "lucide-react";
import { Logo } from "@/components/brand";
import { getSessionUser } from "@/server/session";
import { getCartCount } from "@/server/cart";
import { getCategoryTree } from "@/server/catalog";
import { SearchBar } from "./search-bar";
import { AccountMenu } from "./account-menu";
import { CartButton } from "./cart-button";
import { DeliverTo } from "./deliver-to";
import { CategoryBar } from "./category-bar";

export async function Header() {
  const [user, count, tree, jar] = await Promise.all([getSessionUser(), getCartCount(), getCategoryTree().catch(() => []), cookies()]);
  const city = jar.get("mq_city")?.value ?? "Lahore";
  const categories = tree.map((c) => ({ name: c.name, slug: c.slug, icon: c.icon, children: c.children.map((s) => ({ name: s.name, slug: s.slug })) }));

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-navy-900 text-white">
        <div className="container-page flex h-16 items-center gap-3 md:gap-5">
          <Logo dark className="text-[24px] md:text-[28px]" />
          <DeliverTo city={city} className="hidden lg:flex" />
          <div className="hidden flex-1 md:block">
            <Suspense fallback={<div className="h-11 rounded-[8px] bg-white" />}>
              <SearchBar categories={categories.map(({ name, slug }) => ({ name, slug }))} />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <AccountMenu user={user ? { name: user.name ?? user.email ?? "Account", role: user.role } : null} />
            <Link href="/account/orders" className="focus-dark hidden flex-col rounded-md px-2 py-1 leading-tight hover:bg-white/10 xl:flex">
              <span className="text-[11px] text-white/70">Returns</span>
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Package className="size-4" aria-hidden />& Orders
              </span>
            </Link>
            <CartButton count={count} />
          </div>
        </div>
        <div className="container-page pb-3 md:hidden">
          <Suspense fallback={<div className="h-11 rounded-[8px] bg-white" />}>
            <SearchBar categories={categories.map(({ name, slug }) => ({ name, slug }))} />
          </Suspense>
          <p className="mt-2 flex items-center gap-1 text-xs text-white/75">
            <MapPin className="size-3.5" aria-hidden /> Deliver to <span className="font-semibold text-white">{city}</span>
          </p>
        </div>
      </div>
      <CategoryBar categories={categories} />
    </header>
  );
}
