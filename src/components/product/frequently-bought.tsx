"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/server/actions/cart";
import { formatPrice } from "@/lib/utils";

type Item = { id: string; slug: string; title: string; price: number; image: string | null; variantId: string | null };

export function FrequentlyBought({ items }: { items: Item[] }) {
  const [checked, setChecked] = useState(() => new Set(items.filter((i) => i.variantId).map((i) => i.id)));
  const [pending, start] = useTransition();
  const chosen = items.filter((i) => checked.has(i.id) && i.variantId);
  const total = chosen.reduce((s, i) => s + i.price, 0);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="flex flex-wrap items-center gap-3">
        {items.map((i, idx) => (
          <div key={i.id} className="flex items-center gap-3">
            {idx > 0 && <Plus className="size-5 text-slate" aria-hidden />}
            <Link href={`/p/${i.slug}`} className="relative block size-28 overflow-hidden rounded-[8px] border border-sand bg-sand-50">
              {i.image && <ProductImage src={i.image} alt={i.title} sizes="112px" />}
            </Link>
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-2">
        {items.map((i, idx) => (
          <label key={i.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-navy-900"
              checked={checked.has(i.id)}
              disabled={!i.variantId}
              onChange={() =>
                setChecked((s) => {
                  const n = new Set(s);
                  if (n.has(i.id)) n.delete(i.id);
                  else n.add(i.id);
                  return n;
                })
              }
            />
            <span>
              {idx === 0 && <strong>This item: </strong>}
              {i.title} — <span className="font-semibold">{formatPrice(i.price)}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="shrink-0 space-y-2 rounded-[8px] bg-sand-50 p-4">
        <p className="text-sm">
          Total for {chosen.length}: <strong className="text-lg tabular-nums">{formatPrice(total)}</strong>
        </p>
        <Button
          variant="gold"
          disabled={!chosen.length}
          loading={pending}
          onClick={() =>
            start(async () => {
              for (const i of chosen) {
                const res = await addToCart({ variantId: i.variantId!, quantity: 1 });
                if (!res.ok) return void toast.error(`${i.title}: ${res.error}`);
              }
              toast.success(`Added ${chosen.length} items to cart`);
            })
          }
        >
          Add {chosen.length === items.length ? "all" : chosen.length} to Cart
        </Button>
      </div>
    </div>
  );
}
