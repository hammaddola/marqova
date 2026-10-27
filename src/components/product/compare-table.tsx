"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { ProductImage, Stars, TrustPill } from "@/components/brand";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDeliveryWindow } from "@/lib/delivery";
import { formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/server/catalog";

const KEY = "mq_compare";

export function CompareTable() {
  const [items, setItems] = useState<ProductCardData[] | null>(null);
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      ids = [];
    }
    const load: Promise<ProductCardData[]> = ids.length
      ? fetch(`/api/products?ids=${ids.join(",")}`).then((r) => r.json()).then((d) => d.items)
      : Promise.resolve([]);
    load.then(setItems).catch(() => setItems([]));
  }, []);

  const remove = (id: string) => {
    const next = (items ?? []).filter((i) => i.id !== id);
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.map((i) => i.id)));
    } catch {
      /* ignore */
    }
  };

  if (items === null) return <div className="skeleton h-96" />;
  if (!items.length) return <EmptyState icon={<ArrowLeftRight />} title="Nothing to compare yet" body="Use the Compare button on product pages to add up to 4 items." action={<Button asChild variant="gold"><Link href="/search">Browse products</Link></Button>} />;

  const rows: [string, (p: ProductCardData) => React.ReactNode][] = [
    ["Price", (p) => <strong>{formatPrice(p.price)}</strong>],
    ["Delivery", (p) => (p.shippingFee ? formatPrice(p.shippingFee) : "FREE") + ` · ${formatDeliveryWindow(p.deliveryMinDays, p.deliveryMaxDays)}`],
    ["Rating", (p) => (p.ratingCount ? <Stars value={p.rating} showValue /> : "—")],
    ["Reviews", (p) => p.ratingCount],
    ["Trust Score", (p) => (p.trust != null ? <TrustPill score={p.trust} /> : "—")],
    ["Seller", (p) => p.storeName],
    ["3D / Try-on", (p) => [p.has3d && "3D", p.tryOn && "Try-on"].filter(Boolean).join(" · ") || "—"],
    ["Availability", (p) => (p.inStock ? <span className="text-emerald">In stock</span> : <span className="text-crimson">Out of stock</span>)],
  ];

  return (
    <div className="overflow-x-auto rounded-[8px] border border-sand bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Product comparison</caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 p-4" />
            {items.map((p) => (
              <th key={p.id} scope="col" className="p-4 text-left align-top font-normal">
                <div className="relative mb-2 aspect-square w-full max-w-40 overflow-hidden rounded-md bg-sand-50">{p.image && <ProductImage src={p.image.url} alt="" sizes="160px" />}</div>
                <Link href={`/p/${p.slug}`} className="line-clamp-2 font-medium hover:text-gold-text">{p.title}</Link>
                <button type="button" onClick={() => remove(p.id)} className="mt-1 inline-flex items-center gap-1 text-xs text-slate hover:text-crimson">
                  <X className="size-3" aria-hidden /> Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, cell]) => (
            <tr key={label} className="border-t border-sand">
              <th scope="row" className="bg-sand-50 p-4 text-left font-medium text-slate">{label}</th>
              {items.map((p) => (
                <td key={p.id} className="p-4">{cell(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
