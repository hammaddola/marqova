"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Box, Heart, Shirt, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "@/components/motion";
import { Price, ProductImage, Stars, TrustPill } from "@/components/brand";
import { toggleWishlist } from "@/server/actions/shopper";
import { formatDeliveryWindow } from "@/lib/delivery";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/server/catalog";

export function ProductCard({ p, layout = "grid", priority }: { p: ProductCardData; layout?: "grid" | "list"; priority?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onWish(e: React.MouseEvent) {
    e.preventDefault();
    start(async () => {
      const res = await toggleWishlist(p.id);
      if (!res.ok) toast.error(res.error, { action: { label: "Sign in", onClick: () => router.push(`/login?next=/p/${p.slug}`) } });
      else {
        setSaved(!!res.data?.saved);
        toast.success(res.data?.saved ? "Saved to your wishlist" : "Removed from wishlist");
      }
    });
  }

  const delivery = (
    <p className="text-xs text-slate">
      {p.shippingFee === 0 ? <span className="font-semibold text-emerald">FREE delivery</span> : <span>+ {formatPrice(p.shippingFee)} delivery</span>}{" "}
      <span className="whitespace-nowrap">· {formatDeliveryWindow(p.deliveryMinDays, p.deliveryMaxDays)}</span>
    </p>
  );

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-[8px] border border-sand bg-white transition-[box-shadow,transform] duration-200 hover:-translate-y-[3px] hover:shadow-[var(--shadow-lift)]",
        layout === "grid" ? "flex-col" : "flex-row",
      )}
    >
      <Link href={`/p/${p.slug}`} className={cn("relative block shrink-0 overflow-hidden bg-sand-50", layout === "grid" ? "aspect-square" : "aspect-square w-36 sm:w-52")} tabIndex={-1} aria-hidden>
        {p.image && <ProductImage src={p.image.url} alt="" priority={priority} className="transition-transform duration-500 group-hover:scale-[1.04]" />}
        {p.hoverImage && (
          <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ProductImage src={p.hoverImage.url} alt="" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {p.sponsored && <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate uppercase">Sponsored</span>}
          {(p.has3d || p.tryOn) && (
            <span className="flex items-center gap-1 rounded bg-navy-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {p.tryOn ? <Shirt className="size-3" /> : <Box className="size-3" />}
              {p.tryOn ? "Try-on" : "3D"}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onWish}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-110"
      >
        <motion.span animate={saved ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.35 }}>
          <Heart className={cn("size-4", saved && "fill-crimson text-crimson")} />
        </motion.span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="flex items-center gap-1 truncate text-[11px] font-medium text-slate">
          {p.storeVerified && <BadgeCheck className="size-3.5 shrink-0 text-emerald" aria-label="Verified seller" />}
          {p.storeName.replace("Sample Store — ", "")}
        </p>
        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink">
          <Link href={`/p/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-gold-text">
            {p.title}
          </Link>
        </h3>
        {p.ratingCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <Stars value={p.rating} size={13} />
            <span className="text-xs text-slate">({p.ratingCount})</span>
          </div>
        ) : (
          <p className="text-xs text-slate">No reviews yet</p>
        )}
        <Price value={p.price} compareAt={p.compareAtPrice} size="md" />
        {delivery}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {p.trust != null && !p.isSample && <TrustPill score={p.trust} />}
          {!p.inStock && <span className="text-xs font-semibold text-crimson">Out of stock</span>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, layout = "grid", className }: { products: ProductCardData[]; layout?: "grid" | "list"; className?: string }) {
  return (
    <div className={cn(layout === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3", className)}>
      {products.map((p, i) => (
        <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
          <ProductCard p={p} layout={layout} priority={i < 4} />
        </div>
      ))}
    </div>
  );
}
