import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { unstable_cache } from "next/cache";
import { BadgeCheck, ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getAI } from "@/lib/providers/ai";
import { DEFAULT_SIZE_CHARTS, estimateBody, recommendSize, type SizeChart } from "@/lib/fit";
import { jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";
import { Stars } from "@/components/brand";
import { SectionHeading } from "@/components/ui/primitives";
import { Gallery } from "@/components/product/gallery";
import { BuyBox, PurchaseProvider, StickyBuyBar, VariantPickers, VariantPrice, type VariantData } from "@/components/product/purchase";
import { TrustBadge } from "@/components/product/trust-badge";
import { SizeGuide } from "@/components/product/size-guide";
import type { ReviewItem } from "@/components/product/reviews";
import { FrequentlyBought, PriceHistory, QA, Reviews } from "@/components/product/lazy";
import { ViewTracker } from "@/components/product/view-tracker";
import { ProductRail } from "@/components/product/product-rail";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { Reveal } from "@/components/motion";
import { categoryPath, flattenTree, getCategoryTree, getFrequentlyBoughtTogether, getOtherOffers, getProductBySlug, getSimilar } from "@/server/catalog";
import { getSessionUser } from "@/server/session";
import { trackStat } from "@/server/orders";

const summarize = unstable_cache(
  async (productId: string, _count: number) => {
    const rows = await db.review.findMany({ where: { productId, status: "PUBLISHED" }, select: { rating: true, body: true }, take: 120, orderBy: { createdAt: "desc" } });
    return getAI().summarizeReviews(rows);
  },
  ["review-summary"],
  { revalidate: 86_400 },
);

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status !== "ACTIVE") return { title: "Product not found" };
  const image = p.media.find((m) => m.type === "IMAGE")?.url;
  const description = (p.bullets[0] ?? p.description).slice(0, 155);
  return {
    title: p.title,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.title, description, url: `/p/${p.slug}`, images: image ? [{ url: image }] : undefined },
    ...(p.isSample && { robots: { index: false } }),
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status !== "ACTIVE") notFound();

  const [user, jar, tree, similar, fbt, offers, reviewRows, questions] = await Promise.all([
    getSessionUser(),
    cookies(),
    getCategoryTree(),
    getSimilar(p),
    getFrequentlyBoughtTogether(p),
    getOtherOffers(p),
    db.review.findMany({
      where: { productId: p.id, status: "PUBLISHED" },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { user: { select: { name: true } }, media: { select: { url: true } } },
    }),
    db.question.findMany({
      where: { productId: p.id },
      orderBy: { upvotes: "desc" },
      take: 20,
      include: { answers: { orderBy: { upvotes: "desc" }, include: { user: { select: { name: true } } } } },
    }),
  ]);
  const summary = await summarize(p.id, p.ratingCount);
  const city = jar.get("mq_city")?.value ?? "Lahore";

  const [saved, avatar] = user
    ? await Promise.all([
        db.wishlist.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } }),
        p.tryOnType !== "NONE" ? db.avatarProfile.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null,
      ])
    : [null, null];

  const chart: SizeChart | null = p.tryOnType !== "NONE" && p.tryOnType !== "ACCESSORY" ? DEFAULT_SIZE_CHARTS[p.tryOnType] : null;
  const recommended = chart && avatar ? recommendSize(chart, estimateBody(avatar)).recommended : null;

  const flat = flattenTree(tree);
  const node = flat.find((c) => c.id === p.categoryId);
  const crumbs = node ? categoryPath(flat, node) : [];
  const axes = p.category.attributes.filter((a) => a.variantAxis).map((a) => ({ key: a.key, label: a.label, type: a.type }));
  const variants: VariantData[] = p.variants.map((v) => ({ id: v.id, title: v.title, options: v.options as Record<string, string>, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, colorHex: v.colorHex }));
  const attrs = p.attributes as Record<string, string | string[]>;
  // jsonb stores keys sorted by length, so order rows explicitly: identity, attributes, logistics, then aftercare.
  const attrRows = p.category.attributes.filter((a) => !a.variantAxis && attrs[a.key]).map((a) => [a.label, [attrs[a.key]].flat().join(", ") + (a.unit ? ` ${a.unit}` : "")] as [string, string]);
  // A free-form spec that repeats an attribute (e.g. "Warranty") is shown once, as the attribute.
  const specs = Object.entries(p.specs as Record<string, string>).filter(([k]) => !attrRows.some(([label]) => label === k));
  const IDENTITY = ["Brand", "Model number", "Model"];
  const AFTERCARE = ["Warranty", "Care"];
  const byKeys = (keys: string[]) => keys.flatMap((k) => specs.filter(([key]) => key === k));
  const specRows: [string, string][] = [
    ...byKeys(IDENTITY),
    ...attrRows,
    ...specs.filter(([k]) => !IDENTITY.includes(k) && !AFTERCARE.includes(k)),
    ...byKeys(AFTERCARE),
  ];
  const storeTrust = p.store.trustScore;
  const productTrust = p.trustScore;
  const apparel = ["TOP", "BOTTOM", "DRESS", "SHOES"].includes(p.tryOnType);
  const inStock = p.variants.some((v) => v.stock > 0);

  const reviews: ReviewItem[] = reviewRows.map((r) => ({
    id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.user.name ?? "Marqova shopper", createdAt: r.createdAt.toISOString(),
    fit: r.fit, heightCm: r.reviewerHeightCm, sizeBought: r.sizeBought, helpful: r.helpfulCount, photos: r.media.map((m) => m.url), isSample: r.isSample,
  }));

  const fbtItems = fbt.length
    ? await Promise.all(
        [{ id: p.id, slug: p.slug, title: p.title, price: p.basePrice, image: p.media.find((m) => m.type === "IMAGE")?.url ?? null }, ...fbt.map((f) => ({ id: f.id, slug: f.slug, title: f.title, price: f.price, image: f.image?.url ?? null }))].map(async (i) => {
          const v = await db.productVariant.findFirst({ where: { productId: i.id, isActive: true, stock: { gt: 0 } }, orderBy: { price: "asc" }, select: { id: true, price: true } });
          return { ...i, variantId: v?.id ?? null, price: v?.price ?? i.price };
        }),
      )
    : [];

  after(async () => {
    await db.product.update({ where: { id: p.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    await trackStat(p.id, "views");
  });

  const image = p.media.find((m) => m.type === "IMAGE")?.url;
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description.slice(0, 500),
    sku: p.variants[0]?.sku,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    image: image ? [image.startsWith("/") ? siteUrl(image) : image] : undefined,
    // Preview listings aren't for sale: never publish their price, stock or rating as a live offer.
    offers: p.isSample ? undefined : {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: (Math.min(...p.variants.map((v) => v.price)) / 100).toFixed(0),
      highPrice: (Math.max(...p.variants.map((v) => v.price)) / 100).toFixed(0),
      offerCount: p.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: p.store.name },
      url: siteUrl(`/p/${p.slug}`),
    },
    aggregateRating: p.ratingCount && !p.isSample ? { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } : undefined,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", url: siteUrl("/") }, ...crumbs.map((c) => ({ name: c.name, url: siteUrl(`/c/${c.slug}`) })), { name: p.title, url: siteUrl(`/p/${p.slug}`) }].map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: b.url })),
  };

  return (
    <div className="container-page pt-5 pb-28 lg:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)} />
      <ViewTracker productId={p.id} />

      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-slate">
        <Link href="/" className="hover:text-gold-text">Home</Link>
        {crumbs.map((c) => (
          <span key={c.slug} className="flex items-center gap-1">
            <ChevronRight className="size-3" aria-hidden />
            <Link href={`/c/${c.slug}`} className="hover:text-gold-text">{c.name}</Link>
          </span>
        ))}
      </nav>

      <PurchaseProvider variants={variants} axes={axes}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_320px]">
          <div className="min-w-0 lg:sticky lg:top-32 lg:self-start">
            <Gallery media={p.media.map((m) => ({ id: m.id, type: m.type, url: m.url, alt: m.alt, usdzUrl: m.usdzUrl }))} title={p.title} productId={p.id} tryOn={p.tryOnType !== "NONE"} />
          </div>

          <div className="min-w-0 space-y-5">
            <div>
              <Link href={`/store/${p.store.slug}`} className="text-sm font-semibold text-gold-text hover:underline">
                Visit {p.store.name}
              </Link>
              <h1 className="heading-display mt-1 text-2xl leading-tight md:text-[30px]">{p.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {p.ratingCount > 0 ? (
                  <a href="#reviews" className="flex items-center gap-1.5 hover:underline">
                    <Stars value={p.ratingAvg} showValue />
                    <span className="text-slate">({p.ratingCount} verified reviews)</span>
                  </a>
                ) : (
                  <span className="text-slate">No reviews yet</span>
                )}
                {productTrust && <TrustBadge score={productTrust.score} inputs={productTrust} subject="product" preview={p.isSample} />}
              </div>
            </div>
            <div className="border-y border-sand py-4">
              <VariantPrice />
              <p className="mt-1 text-xs text-slate">Price includes all taxes. Delivery cost and date shown before you add to cart.</p>
              {p.isSample && (
                <p className="mt-3 rounded-[8px] border border-gold-500/40 bg-gold-100/60 px-3 py-2 text-xs">
                  <strong>Preview listing.</strong> This item isn&apos;t for sale yet. Price, stock and delivery dates show how a live listing will look, and orders aren&apos;t shipped or charged.
                </p>
              )}
            </div>
            <VariantPickers recommendedSize={recommended} sizeGuide={chart ? <SizeGuide chart={chart} productId={p.id} /> : undefined} />
            {apparel && !avatar && (
              <p className="rounded-[8px] bg-gold-100/60 px-4 py-3 text-sm">
                Not sure about your size?{" "}
                <Link href={`/try-on?product=${p.id}`} className="font-semibold text-gold-text underline">
                  Get a size recommendation in the Try-On Studio
                </Link>
              </p>
            )}
            {p.priceHistory.length > 1 && <PriceHistory points={p.priceHistory.map((h) => ({ price: h.price, at: h.recordedAt.toISOString() }))} current={p.basePrice} productId={p.id} />}
            {p.bullets.length > 0 && (
              <div>
                <h2 className="mb-2 text-base font-semibold">About this item</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-gold-500">
                  {p.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="grid grid-cols-3 gap-2 text-center text-xs">
              <li className="rounded-[8px] bg-white p-3 ring-1 ring-sand">
                <Truck className="mx-auto mb-1 size-5 text-gold-text" aria-hidden /> Tracked delivery
              </li>
              <li className="rounded-[8px] bg-white p-3 ring-1 ring-sand">
                <RotateCcw className="mx-auto mb-1 size-5 text-gold-text" aria-hidden /> {p.returnWindowDays}-day returns
              </li>
              <li className="rounded-[8px] bg-white p-3 ring-1 ring-sand">
                <ShieldCheck className="mx-auto mb-1 size-5 text-gold-text" aria-hidden /> Buyer protection
              </li>
            </ul>
          </div>

          <aside className="lg:sticky lg:top-32 lg:self-start" aria-label="Buy box">
            <BuyBox
              productId={p.id}
              slug={p.slug}
              title={p.title}
              shippingFee={p.shippingFee}
              deliveryMinDays={p.deliveryMinDays}
              deliveryMaxDays={p.deliveryMaxDays}
              returnWindowDays={p.returnWindowDays}
              city={city}
              store={{ name: p.store.name, slug: p.store.slug, verified: p.store.isVerified, responseHours: p.store.responseTimeHours, returnPolicy: p.store.returnPolicy, trust: storeTrust?.score ?? null }}
              otherOffers={offers}
              initiallySaved={!!saved}
            />
            {storeTrust && (
              <div className="mt-3 flex items-center justify-between rounded-[8px] border border-sand bg-white p-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <BadgeCheck className="size-4 text-emerald" aria-hidden /> Seller trust
                </span>
                <TrustBadge score={storeTrust.score} inputs={storeTrust} preview={p.isSample} />
              </div>
            )}
          </aside>
        </div>
        <StickyBuyBar />
      </PurchaseProvider>

      <div className="mt-14 space-y-14">
        {fbtItems.length > 1 && (
          <Reveal>
            <section>
              <SectionHeading title="Frequently bought together" />
              <FrequentlyBought items={fbtItems} />
            </section>
          </Reveal>
        )}

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title="Product description" />
            <div className="prose-marqova text-sm">
              {p.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading title="Specifications" />
            <table className="w-full overflow-hidden rounded-[8px] text-sm ring-1 ring-sand">
              <caption className="sr-only">Technical specifications</caption>
              <tbody>
                {specRows.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? "bg-white" : "bg-sand-50"}>
                    <th scope="row" className="w-2/5 px-4 py-2.5 text-left font-medium text-slate">{k}</th>
                    <td className="px-4 py-2.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {similar.length > 0 && (
          <section>
            <SectionHeading title="Similar items" subtitle="Comparable price and category, ranked by rating." />
            <ProductRail products={similar} label="Similar items" />
          </section>
        )}

        <section id="qa" className="scroll-mt-32">
          <SectionHeading title="Questions & answers" />
          <QA
            productId={p.id}
            questions={questions.map((q) => ({
              id: q.id, body: q.body, upvotes: q.upvotes, createdAt: q.createdAt.toISOString(), isSample: q.isSample,
              answers: q.answers.map((a) => ({ id: a.id, body: a.body, isSeller: a.isSeller, upvotes: a.upvotes, author: a.user.name ?? "Shopper", createdAt: a.createdAt.toISOString() })),
            }))}
          />
        </section>

        <section id="reviews" className="scroll-mt-32">
          <SectionHeading title="Customer reviews" subtitle="Verified buyers only." />
          <Reviews reviews={reviews} summary={summary} avg={p.ratingAvg} total={p.ratingCount} apparel={apparel} />
        </section>

        <RecentlyViewed excludeId={p.id} />
      </div>
    </div>
  );
}
