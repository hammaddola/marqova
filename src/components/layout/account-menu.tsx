"use client";

import Link from "next/link";
import { DropdownMenu as DM } from "radix-ui";
import { ChevronDown, LayoutDashboard, LogOut, Package, Heart, Bell, Ruler, Store, Shield, User } from "lucide-react";
import { signOutAction } from "@/server/actions/auth";
import { MULTI_SELLER } from "@/lib/marketplace";

export function AccountMenu({ user }: { user: { name: string; role: "SHOPPER" | "SELLER" | "ADMIN" } | null }) {
  if (!user) {
    return (
      <Link href="/login" className="focus-dark flex flex-col rounded-md px-2 py-1 leading-tight hover:bg-white/10">
        <span className="hidden text-[11px] text-white/70 sm:block">Hello, sign in</span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          <User className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Account</span>
          <span className="sr-only sm:hidden">Sign in</span>
        </span>
      </Link>
    );
  }
  const first = user.name.split(" ")[0];
  const item = "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-sand-50 [&_svg]:size-4 [&_svg]:text-slate";
  return (
    <DM.Root>
      <DM.Trigger className="focus-dark flex flex-col rounded-md px-2 py-1 text-left leading-tight hover:bg-white/10">
        <span className="hidden text-[11px] text-white/70 sm:block">Hello, {first}</span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          <User className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Account</span>
          <span className="sr-only">Open account menu</span>
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={8} className="z-50 w-60 rounded-[8px] border border-sand bg-white p-1.5 shadow-[var(--shadow-lift)]">
          <DM.Label className="px-3 py-2 text-xs text-slate">Signed in as {user.name}</DM.Label>
          <DM.Item asChild>
            <Link href="/account" className={item}>
              <User /> Your account
            </Link>
          </DM.Item>
          <DM.Item asChild>
            <Link href="/account/orders" className={item}>
              <Package /> Orders & returns
            </Link>
          </DM.Item>
          <DM.Item asChild>
            <Link href="/account/wishlist" className={item}>
              <Heart /> Wishlist
            </Link>
          </DM.Item>
          <DM.Item asChild>
            <Link href="/account/alerts" className={item}>
              <Bell /> Price alerts
            </Link>
          </DM.Item>
          <DM.Item asChild>
            <Link href="/account/avatars" className={item}>
              <Ruler /> Sizes & avatars
            </Link>
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-sand" />
          {(user.role === "SELLER" || user.role === "ADMIN") && (
            <DM.Item asChild>
              <Link href="/seller" className={item}>
                <Store /> Seller Hub
              </Link>
            </DM.Item>
          )}
          {user.role === "ADMIN" && (
            <DM.Item asChild>
              <Link href="/admin" className={item}>
                <Shield /> Admin panel
              </Link>
            </DM.Item>
          )}
          {MULTI_SELLER && user.role === "SHOPPER" && (
            <DM.Item asChild>
              <Link href="/sell" className={item}>
                <LayoutDashboard /> Start selling
              </Link>
            </DM.Item>
          )}
          <DM.Separator className="my-1 h-px bg-sand" />
          <form action={signOutAction}>
            <DM.Item asChild>
              <button type="submit" className={`${item} w-full`}>
                <LogOut /> Sign out
              </button>
            </DM.Item>
          </form>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
