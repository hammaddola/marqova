import Link from "next/link";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { productCardSelect, toCard } from "@/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const rows = await db.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: productCardSelect } } });
  return (
    <div>
      <h1 className="heading-display mb-6 text-3xl">Wishlist</h1>
      {rows.length ? (
        <ProductGrid products={rows.map((r) => toCard(r.product))} />
      ) : (
        <EmptyState icon={<Heart />} title="Nothing saved yet" body="Tap the heart on any product to save it here." action={<Button asChild variant="gold"><Link href="/search">Browse products</Link></Button>} />
      )}
    </div>
  );
}
