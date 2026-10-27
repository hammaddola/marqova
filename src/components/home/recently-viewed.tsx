"use client";

import { useEffect, useState } from "react";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeading } from "@/components/ui/primitives";
import type { ProductCardData } from "@/server/catalog";

export const RECENT_PRODUCTS_KEY = "mq_recent_products";

export function rememberProduct(id: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) ?? "[]");
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

export function RecentlyViewed({ excludeId, title = "Recently viewed" }: { excludeId?: string; title?: string }) {
  const [items, setItems] = useState<ProductCardData[]>([]);
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) ?? "[]");
    } catch {
      ids = [];
    }
    ids = ids.filter((id) => id !== excludeId).slice(0, 12);
    if (!ids.length) return;
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items))
      .catch(() => {});
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section>
      <SectionHeading title={title} subtitle="Pick up where you left off. Stored only on this device." />
      <ProductRail products={items} label={title} />
    </section>
  );
}
