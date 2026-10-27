"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import type { ProductCardData } from "@/server/catalog";
import { cn } from "@/lib/utils";

/** Horizontally scrolling product carousel (Embla): swipe on touch, arrows on desktop. */
export function ProductRail({ products, label }: { products: ProductCardData[]; label: string }) {
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [canPrev, setPrev] = useState(false);
  const [canNext, setNext] = useState(false);
  const sync = useCallback(() => {
    if (!api) return;
    setPrev(api.canScrollPrev());
    setNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const frame = requestAnimationFrame(sync);
    api.on("select", sync).on("reInit", sync).on("scroll", sync);
    return () => {
      cancelAnimationFrame(frame);
      api.off("select", sync).off("reInit", sync).off("scroll", sync);
    };
  }, [api, sync]);

  const arrow = "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-sand bg-white text-ink shadow-[var(--shadow-card)] transition-all hover:scale-105 disabled:opacity-0 md:grid";
  return (
    <section aria-roledescription="carousel" aria-label={label} className="relative">
      <div ref={ref} className="overflow-hidden">
        <div className="-ml-3 flex touch-pan-y sm:-ml-4">
          {products.map((p) => (
            <div key={p.id} className="min-w-0 shrink-0 basis-[46%] pl-3 sm:basis-[31%] sm:pl-4 lg:basis-[23%] xl:basis-[18.5%]">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
      <button className={cn(arrow, "-left-3")} onClick={() => api?.scrollPrev()} disabled={!canPrev} aria-label="Previous products">
        <ChevronLeft className="size-5" />
      </button>
      <button className={cn(arrow, "-right-3")} onClick={() => api?.scrollNext()} disabled={!canNext} aria-label="Next products">
        <ChevronRight className="size-5" />
      </button>
    </section>
  );
}
