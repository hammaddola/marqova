"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Minus, Plus, Trash2, Tag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { ProductImage } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { applyCoupon, removeCartItem, updateCartItem } from "@/server/actions/cart";
import { formatPrice } from "@/lib/utils";

export type CartLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  stock: number;
  available: boolean;
  quantityTooHigh: boolean;
  variantTitle: string;
  title: string;
  slug: string;
  storeName: string;
  image: string | null;
  returnWindowDays: number;
};

export function CartLines({ lines }: { lines: CartLine[] }) {
  const [optimistic, setOptimistic] = useOptimistic(lines, (state, action: { id: string; quantity: number }) =>
    action.quantity === 0 ? state.filter((l) => l.id !== action.id) : state.map((l) => (l.id === action.id ? { ...l, quantity: action.quantity } : l)),
  );
  const [, start] = useTransition();

  const change = (id: string, quantity: number) =>
    start(async () => {
      setOptimistic({ id, quantity });
      const res = quantity === 0 ? await removeCartItem(id) : await updateCartItem(id, quantity);
      if (!res.ok) toast.error(res.error);
      else if (quantity === 0) toast.success("Removed from cart");
    });

  return (
    <ul className="divide-y divide-sand rounded-[8px] border border-sand bg-white">
      <AnimatePresence initial={false}>
        {optimistic.map((l) => (
          <motion.li key={l.id} layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="flex gap-4 overflow-hidden p-4 sm:p-5">
            <Link href={`/p/${l.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-md bg-sand-50 sm:size-32">
              {l.image && <ProductImage src={l.image} alt={l.title} sizes="128px" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/p/${l.slug}`} className="line-clamp-2 text-sm font-medium hover:text-gold-text sm:text-base">
                {l.title}
              </Link>
              <p className="mt-0.5 text-xs text-slate">
                {l.variantTitle} · Sold by {l.storeName}
              </p>
              {!l.available ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-crimson">
                  <AlertTriangle className="size-3.5" aria-hidden /> No longer available — remove to continue
                </p>
              ) : l.quantityTooHigh ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-crimson">
                  <AlertTriangle className="size-3.5" aria-hidden /> Only {l.stock} left — reduce the quantity
                </p>
              ) : (
                <p className="mt-1 text-xs font-medium text-emerald">In stock · {l.returnWindowDays}-day returns</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-[8px] border border-sand" role="group" aria-label={`Quantity for ${l.title}`}>
                  <button type="button" className="grid size-9 place-items-center disabled:opacity-40" onClick={() => change(l.id, l.quantity - 1)} aria-label="Decrease quantity">
                    {l.quantity === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                  <button type="button" className="grid size-9 place-items-center disabled:opacity-40" onClick={() => change(l.id, l.quantity + 1)} disabled={l.quantity >= l.stock} aria-label="Increase quantity">
                    <Plus className="size-4" />
                  </button>
                </div>
                <button type="button" onClick={() => change(l.id, 0)} className="text-xs font-medium text-slate hover:text-crimson">
                  Remove
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</p>
              {l.compareAtPrice && l.compareAtPrice > l.unitPrice && <p className="text-xs text-slate line-through">{formatPrice(l.compareAtPrice * l.quantity)}</p>}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function CouponForm({ current }: { current: string | null }) {
  const [code, setCode] = useState(current ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await applyCoupon(code);
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message);
        });
      }}
    >
      <label htmlFor="coupon" className="sr-only">Coupon code</label>
      <div className="relative flex-1">
        <Tag className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" aria-hidden />
        <Input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="pl-9 uppercase" />
      </div>
      {current ? (
        <Button type="button" variant="secondary" loading={pending} onClick={() => start(async () => void (await applyCoupon(""), setCode("")))}>
          Remove
        </Button>
      ) : (
        <Button type="submit" variant="secondary" loading={pending} disabled={!code}>
          Apply
        </Button>
      )}
    </form>
  );
}
