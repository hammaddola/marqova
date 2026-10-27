import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { ProductGrid } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/primitives";
import { getDeals } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Today's Deals",
  description: "Limited-time deals from verified sellers. Every discount is checked against the item's recent price history.",
  alternates: { canonical: "/deals" },
};

export default async function DealsPage() {
  const deals = await getDeals(48);
  return (
    <div className="container-page py-8">
      <div className="mb-8 rounded-[12px] bg-navy-900 px-6 py-8 text-white md:px-10">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase">
          <Timer className="size-4" aria-hidden /> Today&apos;s deals
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Honest discounts, no countdown games.</h1>
        <p className="mt-2 max-w-2xl text-white/75">Each “was” price is the item&apos;s real recent price — open any product to see its full price history.</p>
      </div>
      {deals.length ? <ProductGrid products={deals} /> : <EmptyState title="No deals right now" body="Check back soon — sellers add new deals every day." />}
    </div>
  );
}
