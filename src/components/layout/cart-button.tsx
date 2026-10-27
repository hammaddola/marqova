"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "@/components/motion";

export function CartButton({ count }: { count: number }) {
  return (
    <Link href="/cart" className="focus-dark relative flex items-end gap-1 rounded-md px-2 py-1 hover:bg-white/10" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
      <span className="relative">
        <ShoppingCart className="size-7" aria-hidden />
        <span className="absolute -top-2 left-1/2 grid min-w-5 -translate-x-1/2 place-items-center overflow-hidden rounded-full bg-gold-500 px-1 text-[11px] leading-5 font-bold text-navy-900" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={count} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              {count > 99 ? "99+" : count}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <span className="hidden text-sm font-semibold sm:inline">Cart</span>
    </Link>
  );
}
