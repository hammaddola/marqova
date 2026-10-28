import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Package, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { productCardSelect, toCard } from "@/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { TrustBadge } from "@/components/product/trust-badge";
import { ContactSeller } from "@/components/store/contact-seller";
import { Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion";
import { jsonLd } from "@/lib/seo";
import { siteUrl, formatDate } from "@/lib/utils";

const getStore = (slug: string) =>
  db.store.findUnique({ where: { slug }, include: { trustScore: true, seller: { select: { tier: true, status: true, approvedAt: true } } } });

export async function generateMetadata({ params }: PageProps<"/store/[slug]">): Promise<Metadata> {
  const store = await getStore((await params).slug);
  if (!store) return { title: "Store not found" };
  return { title: store.name, description: store.tagline ?? store.description ?? undefined, alternates: { canonical: `/store/${store.slug}` } };
}

export default async function StorePage({ params }: PageProps<"/store/[slug]">) {
  const store = await getStore((await params).slug);
  if (!store || store.seller.status !== "APPROVED") notFound();
  const [products, count, reviews] = await Promise.all([
    db.product.findMany({ where: { storeId: store.id, status: "ACTIVE" }, orderBy: { salesCount: "desc" }, take: 48, select: productCardSelect }),
    db.product.count({ where: { storeId: store.id, status: "ACTIVE" } }),
    db.review.aggregate({ where: { product: { storeId: store.id }, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@type": "Organization", name: store.name, url: siteUrl(`/store/${store.slug}`), description: store.description })} />
      <section className="bg-navy-900 text-white">
        <div className="container-page flex flex-wrap items-end justify-between gap-6 py-10">
          <Reveal>
            <div className="flex items-center gap-4">
              <span className="font-display grid size-16 place-items-center rounded-full bg-gold-500 text-2xl font-semibold text-navy-900" aria-hidden>
                {store.name.replace("Sample Store — ", "").charAt(0)}
              </span>
              <div>
                <h1 className="font-display text-3xl font-semibold">{store.name}</h1>
                {store.tagline && <p className="text-white/70">{store.tagline}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {store.isVerified && (
                    <Badge tone="emerald">
                      <BadgeCheck aria-hidden /> Verified seller
                    </Badge>
                  )}
                  <Badge tone="gold" className="capitalize">{store.seller.tier.toLowerCase()} seller</Badge>
                  {store.trustScore && <TrustBadge score={store.trustScore.score} inputs={store.trustScore} preview={store.isSample} />}
                  {store.isSample && <Badge tone="outline" className="border-white/30 text-white/80">Preview store</Badge>}
                </div>
              </div>
            </div>
          </Reveal>
          <ContactSeller storeId={store.id} storeName={store.name} />
        </div>
      </section>
      <div className="container-page grid gap-4 py-6 text-sm sm:grid-cols-4">
        <p className="flex items-center gap-2"><Package className="size-4 text-gold-text" aria-hidden /> {count} active listings</p>
        <p className="flex items-center gap-2"><Clock className="size-4 text-gold-text" aria-hidden /> Replies within {store.responseTimeHours}h</p>
        <p className="flex items-center gap-2"><RotateCcw className="size-4 text-gold-text" aria-hidden /> {store.returnPolicy.split(".")[0]}</p>
        <p className="text-slate">
          {reviews._count._all} verified reviews · avg {(reviews._avg.rating ?? 0).toFixed(1)}★{store.seller.approvedAt && ` · since ${formatDate(store.seller.approvedAt, { month: "short", year: "numeric" })}`}
        </p>
      </div>
      <div className="container-page pb-8">
        {store.description && <p className="mb-8 max-w-3xl text-slate">{store.description}</p>}
        <ProductGrid products={products.map((p) => toCard(p))} />
      </div>
    </div>
  );
}
