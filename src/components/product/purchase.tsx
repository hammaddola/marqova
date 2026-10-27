"use client";

import Link from "next/link";
import { createContext, use, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Lock, MapPin, Minus, Plus, Share2, ArrowLeftRight, ShieldCheck, Ruler } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/brand";
import { addToCart } from "@/server/actions/cart";
import { toggleWishlist } from "@/server/actions/shopper";
import { FREE_DELIVERY_THRESHOLD, cityAdjustment, formatDeliveryWindow } from "@/lib/delivery";
import { cn, formatPrice } from "@/lib/utils";

export type VariantData = { id: string; title: string; options: Record<string, string>; price: number; compareAtPrice: number | null; stock: number; colorHex: string | null };
type Axis = { key: string; label: string; type: string };

type Ctx = {
  variants: VariantData[];
  axes: Axis[];
  selected: Record<string, string>;
  select: (key: string, value: string) => void;
  variant: VariantData | null;
  quantity: number;
  setQuantity: (n: number) => void;
};

const PurchaseCtx = createContext<Ctx | null>(null);
const usePurchase = () => {
  const c = use(PurchaseCtx);
  if (!c) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return c;
};

export function PurchaseProvider({ variants, axes, children }: { variants: VariantData[]; axes: Axis[]; children: React.ReactNode }) {
  const initial = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(initial?.options ?? {});
  const [quantity, setQuantity] = useState(1);
  const variant = useMemo(() => variants.find((v) => axes.every((a) => !v.options[a.key] || v.options[a.key] === selected[a.key])) ?? null, [variants, axes, selected]);

  const select = (key: string, value: string) => {
    const next = { ...selected, [key]: value };
    // If the exact combination doesn't exist, jump to the closest in-stock variant with this value.
    if (!variants.some((v) => axes.every((a) => v.options[a.key] === next[a.key]))) {
      const fallback = variants.find((v) => v.options[key] === value && v.stock > 0) ?? variants.find((v) => v.options[key] === value);
      if (fallback) return setSelected(fallback.options);
    }
    setSelected(next);
    setQuantity(1);
  };

  return <PurchaseCtx value={{ variants, axes, selected, select, variant, quantity, setQuantity }}>{children}</PurchaseCtx>;
}

export function VariantPrice() {
  const { variant } = usePurchase();
  if (!variant) return null;
  return <Price value={variant.price} compareAt={variant.compareAtPrice} size="xl" />;
}

export function VariantPickers({ recommendedSize, sizeGuide }: { recommendedSize?: string | null; sizeGuide?: React.ReactNode }) {
  const { variants, axes, selected, select } = usePurchase();
  return (
    <div className="space-y-5">
      {axes.map((axis) => {
        const values = [...new Set(variants.map((v) => v.options[axis.key]).filter(Boolean))];
        if (!values.length) return null;
        const available = (val: string) => variants.some((v) => v.options[axis.key] === val && v.stock > 0 && axes.every((a) => a.key === axis.key || !selected[a.key] || v.options[a.key] === selected[a.key]));
        return (
          <fieldset key={axis.key}>
            <legend className="mb-2 flex w-full items-center justify-between text-sm">
              <span>
                <span className="text-slate">{axis.label}: </span>
                <span className="font-semibold">{selected[axis.key]}</span>
              </span>
              {axis.type === "SIZE" && sizeGuide}
            </legend>
            {axis.type === "SIZE" && recommendedSize && values.includes(recommendedSize) && (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald">
                <Ruler className="size-3.5" aria-hidden /> Recommended size for you: <strong>{recommendedSize}</strong>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const on = selected[axis.key] === val;
                const ok = available(val);
                if (axis.type === "COLOR") {
                  const hex = variants.find((v) => v.options[axis.key] === val)?.colorHex ?? "#ccc";
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => select(axis.key, val)}
                      aria-pressed={on}
                      aria-label={`${val}${ok ? "" : " (out of stock)"}`}
                      title={val}
                      className={cn("relative size-10 rounded-full border-2 p-0.5 transition-transform hover:scale-105", on ? "border-navy-900" : "border-sand", !ok && "opacity-40")}
                    >
                      <span className="block h-full w-full rounded-full" style={{ background: hex }} />
                      {!ok && <span className="absolute inset-0 m-auto h-0.5 w-8 rotate-45 bg-slate" aria-hidden />}
                    </button>
                  );
                }
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => select(axis.key, val)}
                    aria-pressed={on}
                    className={cn(
                      "relative h-11 min-w-12 rounded-[8px] border px-3 text-sm font-medium transition-all",
                      on ? "border-navy-900 bg-navy-900 text-white" : "border-sand bg-white hover:border-slate/50",
                      !ok && !on && "text-slate line-through decoration-slate/60",
                      recommendedSize === val && !on && "border-emerald",
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

type BuyBoxProps = {
  productId: string;
  slug: string;
  title: string;
  shippingFee: number;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  returnWindowDays: number;
  city: string;
  store: { name: string; slug: string; verified: boolean; responseHours: number; returnPolicy: string; trust: number | null };
  otherOffers: { slug: string; basePrice: number; store: { name: string } }[];
  initiallySaved: boolean;
};

export function BuyBox(p: BuyBoxProps) {
  const { variant, quantity, setQuantity } = usePurchase();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(p.initiallySaved);
  const extra = cityAdjustment(p.city);
  const stock = variant?.stock ?? 0;
  const lineTotal = (variant?.price ?? 0) * quantity;
  const delivery = lineTotal >= FREE_DELIVERY_THRESHOLD ? 0 : p.shippingFee;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  function add(buyNow: boolean) {
    if (!variant) return;
    start(async () => {
      const res = await addToCart({ variantId: variant.id, quantity });
      if (!res.ok) return void toast.error(res.error);
      if (buyNow) router.push("/checkout");
      else {
        setAdded(true);
        toast.success("Added to cart", { action: { label: "View cart", onClick: () => router.push("/cart") } });
      }
    });
  }

  async function share() {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  }

  function compare() {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("mq_compare") ?? "[]");
      const next = [p.productId, ...list.filter((x) => x !== p.productId)].slice(0, 4);
      localStorage.setItem("mq_compare", JSON.stringify(next));
      toast.success(`Added to compare (${next.length}/4)`, { action: { label: "Compare now", onClick: () => router.push("/compare") } });
    } catch {
      toast.error("Compare needs browser storage enabled.");
    }
  }

  return (
    <div className="rounded-[8px] border border-sand bg-white p-5">
      {variant && <Price value={variant.price} compareAt={variant.compareAtPrice} size="lg" />}
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate">Item{quantity > 1 ? ` × ${quantity}` : ""}</dt>
          <dd className="tabular-nums">{formatPrice(lineTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Delivery</dt>
          <dd className={cn("tabular-nums", delivery === 0 && "font-semibold text-emerald")}>{delivery === 0 ? "FREE" : formatPrice(delivery)}</dd>
        </div>
        <div className="flex justify-between border-t border-sand pt-1.5 font-semibold">
          <dt>Total, no hidden fees</dt>
          <dd className="tabular-nums">{formatPrice(lineTotal + delivery)}</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
        <span>
          Delivery to <strong>{p.city}</strong>: <strong>{formatDeliveryWindow(p.deliveryMinDays + extra, p.deliveryMaxDays + extra)}</strong>
        </span>
      </p>
      <p className={cn("mt-3 text-base font-semibold", stock > 5 ? "text-emerald" : stock > 0 ? "text-amber" : "text-crimson")} aria-live="polite">
        {stock > 5 ? "In stock" : stock > 0 ? `Only ${stock} left — order soon` : "Out of stock in this option"}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate" id="qty-label">Qty</span>
        <div className="flex items-center rounded-[8px] border border-sand" role="group" aria-labelledby="qty-label">
          <button type="button" className="grid size-10 place-items-center disabled:opacity-40" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{quantity}</span>
          <button type="button" className="grid size-10 place-items-center disabled:opacity-40" onClick={() => setQuantity(Math.min(Math.min(stock, 10), quantity + 1))} disabled={quantity >= Math.min(stock, 10)} aria-label="Increase quantity">
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button variant="gold" size="lg" onClick={() => add(false)} loading={pending} disabled={!stock}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={added ? "added" : "add"} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="flex items-center gap-2">
              {added ? (
                <>
                  <Check className="size-4" /> Added
                </>
              ) : (
                "Add to Cart"
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
        <Button variant="navy" size="lg" onClick={() => add(true)} disabled={!stock || pending}>
          Buy Now
        </Button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate">
        <Lock className="size-3.5" aria-hidden /> Secure payment. Marqova never stores your card number.
      </p>

      <div className="mt-4 space-y-2 border-t border-sand pt-4 text-sm">
        <p>
          <span className="text-slate">Sold by </span>
          <Link href={`/store/${p.store.slug}`} className="font-semibold text-gold-text hover:underline">
            {p.store.name}
          </Link>
          {p.store.verified && <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald"><ShieldCheck className="size-3.5" aria-hidden /> Verified</span>}
        </p>
        <p className="text-xs text-slate">Usually replies within {p.store.responseHours}h · {p.returnWindowDays}-day returns</p>
        <p className="text-xs text-slate">{p.store.returnPolicy}</p>
        {p.otherOffers.length > 0 && (
          <Link href={`/p/${p.otherOffers[0].slug}`} className="block text-xs font-semibold text-gold-text hover:underline">
            Other sellers from {formatPrice(p.otherOffers[0].basePrice)} ({p.otherOffers.length})
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-sand pt-4">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={saved}
          onClick={() =>
            start(async () => {
              const res = await toggleWishlist(p.productId);
              if (!res.ok) return void toast.error(res.error);
              setSaved(!!res.data?.saved);
              toast.success(res.data?.saved ? "Saved to wishlist" : "Removed from wishlist");
            })
          }
        >
          <Heart className={cn(saved && "fill-crimson text-crimson")} /> {saved ? "Saved" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={compare}>
          <ArrowLeftRight /> Compare
        </Button>
        <Button variant="ghost" size="sm" onClick={share}>
          <Share2 /> Share
        </Button>
      </div>
    </div>
  );
}

/** Sticky purchase bar for phones (the buy box sits below the fold there). */
export function StickyBuyBar() {
  const { variant } = usePurchase();
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!variant) return null;
  const go = (buyNow: boolean) =>
    start(async () => {
      const res = await addToCart({ variantId: variant.id, quantity: 1 });
      if (!res.ok) return void toast.error(res.error);
      if (buyNow) router.push("/checkout");
      else toast.success("Added to cart");
    });
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold tabular-nums">{formatPrice(variant.price)}</p>
          <p className="truncate text-xs text-slate">{variant.title}</p>
        </div>
        <Button variant="gold" className="ml-auto" onClick={() => go(false)} loading={pending} disabled={!variant.stock}>
          Add to Cart
        </Button>
        <Button variant="navy" onClick={() => go(true)} disabled={!variant.stock || pending}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}
