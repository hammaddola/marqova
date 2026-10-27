"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, BarChart3, Bell, Boxes, Circle, FileBarChart, FolderTree, Heart, KeyRound, LayoutDashboard, LayoutTemplate, ListTodo, MapPin, Megaphone,
  MessageSquare, Package, Percent, PlusSquare, RotateCcw, Ruler, Scale, ShieldAlert, ShoppingBag, Sparkles, Star, Store, Upload, Users, Wallet, Warehouse, type LucideIcon,
} from "lucide-react";
import { motion } from "@/components/motion";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  BadgeCheck, BarChart3, Bell, Boxes, FileBarChart, FolderTree, Heart, KeyRound, LayoutDashboard, LayoutTemplate, ListTodo, MapPin, Megaphone,
  MessageSquare, Package, Percent, PlusSquare, RotateCcw, Ruler, Scale, ShieldAlert, ShoppingBag, Sparkles, Star, Store, Upload, Users, Wallet, Warehouse,
};

type Item = { href: string; label: string; icon: string; badge?: number };

/** Section navigation for Account, Seller Hub and Admin. Horizontal scroller on mobile, sidebar on desktop. */
export function SideNav({ title, items, dark }: { title: string; items: Item[]; dark?: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href.split("/").length > 2 && pathname.startsWith(href + "/"));
  return (
    <nav aria-label={title} className="lg:sticky lg:top-32 lg:self-start">
      <p className={cn("mb-3 hidden px-3 text-xs font-semibold tracking-wide uppercase lg:block", dark ? "text-white/60" : "text-slate")}>{title}</p>
      <ul className="flex gap-1 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:pb-0">
        {items.map((it) => {
          const Icon = ICONS[it.icon] ?? Circle;
          const on = active(it.href);
          return (
            <li key={it.href} className="relative shrink-0">
              {on && <motion.span layoutId={`nav-${title}`} className={cn("absolute inset-0 rounded-md", dark ? "bg-white/10" : "bg-white shadow-sm ring-1 ring-sand")} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  dark ? (on ? "font-semibold text-white" : "text-white/75 hover:text-white") : on ? "font-semibold text-ink" : "text-slate hover:text-ink",
                )}
              >
                <Icon className={cn("size-4", on ? "text-gold-500" : "")} aria-hidden />
                {it.label}
                {!!it.badge && <span className="ml-auto rounded-full bg-crimson px-1.5 text-[10px] font-bold text-white">{it.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
