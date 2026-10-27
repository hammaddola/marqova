import Link from "next/link";
import { ArrowRight, BadgeCheck, Receipt, RotateCcw, ShieldCheck, Sparkles, Store, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { CategoryIcon } from "@/components/category-icon";
import { ProductRail } from "@/components/product/product-rail";
import { HeroVisual } from "@/components/home/hero-visual";
import { DealCountdown } from "@/components/home/deal-countdown";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { getBestsellers, getCategoryTree, getDeals } from "@/server/catalog";
import { jsonLd } from "@/lib/seo";
import { db } from "@/lib/db";

export default async function HomePage() {
  const [tree, deals, recommended, sections] = await Promise.all([getCategoryTree(), getDeals(14), getBestsellers(16), db.homeSection.findMany({ where: { active: true }, orderBy: { position: "asc" }, take: 4 })]);
  const soonestDeal = deals.map((d) => d.dealEndsAt).filter(Boolean).sort()[0] ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Marqova",
          url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          slogan: "See it. Trust it. Own it.",
        })}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(200,162,74,0.18),transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgba(28,42,64,0.9),transparent_70%)]" />
        <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20 lg:py-24">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-white/5 px-3 py-1 text-xs font-medium text-gold-300">
              <Sparkles className="size-3.5" aria-hidden /> Every niche. Verified sellers. Honest prices.
            </p>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[64px]">
              See it. <span className="text-gold-500">Trust</span> it.
              <br />
              Own it.
            </h1>
            <p className="mt-5 max-w-lg text-base text-white/75 md:text-lg">
              Shop in 3D, try clothes on your own body shape, and see the full price — delivery included — before you ever reach checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/search">
                  Start shopping <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outlineLight" size="lg">
                <Link href="/try-on">
                  <Sparkles /> Try clothes on in 3D
                </Link>
              </Button>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why shop on Marqova" className="border-b border-sand bg-white">
        <Stagger className="container-page grid grid-cols-2 gap-4 py-5 md:grid-cols-4">
          {[
            [BadgeCheck, "Verified sellers", "ID & business checked"],
            [ShieldCheck, "Real reviews only", "Delivered orders only"],
            [Receipt, "Full price upfront", "Delivery shown on every card"],
            [RotateCcw, "Easy returns", "Clear policy on every item"],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof BadgeCheck;
            return (
              <StaggerItem key={title as string} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-text">
                  <I className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title as string}</span>
                  <span className="block text-xs text-slate">{body as string}</span>
                </span>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <div className="container-page space-y-16 py-12">
        {/* Category grid */}
        <section>
          <SectionHeading title="Shop every niche" subtitle="From everyday essentials to handmade one-offs." action={<Link href="/search" className="text-sm font-semibold text-gold-text hover:underline">Browse all</Link>} />
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {tree.map((c) => (
              <StaggerItem key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  className="group flex h-full flex-col items-start gap-3 rounded-[8px] border border-sand bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-[var(--shadow-card)]"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-navy-900 text-gold-500 transition-transform group-hover:scale-110">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="text-sm leading-tight font-semibold">{c.name}</span>
                  <span className="text-xs text-slate">{c.children.length} departments</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Admin-managed homepage sections */}
        {sections.length > 0 && (
          <Stagger className="grid gap-3 md:grid-cols-2">
            {sections.map((s) => (
              <StaggerItem key={s.id}>
                <Link href={s.href ?? "/"} className="group flex items-center justify-between gap-4 rounded-[8px] border border-sand bg-white p-6 transition-colors hover:border-gold-500">
                  <span>
                    <span className="heading-display block text-xl">{s.title}</span>
                    {s.subtitle && <span className="mt-1 block text-sm text-slate">{s.subtitle}</span>}
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-gold-text transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {/* Deals */}
        {deals.length > 0 && (
          <section>
            <SectionHeading
              title="Today's deals"
              subtitle="Real discounts against each item's recent price history."
              action={
                <div className="flex items-center gap-4">
                  {soonestDeal && <DealCountdown endsAt={soonestDeal} />}
                  <Link href="/deals" className="text-sm font-semibold text-gold-text hover:underline">
                    See all deals
                  </Link>
                </div>
              }
            />
            <ProductRail products={deals} label="Today's deals" />
          </section>
        )}

        {/* Try-on band */}
        <Reveal>
          <section className="grid overflow-hidden rounded-[12px] bg-navy-900 text-white md:grid-cols-2">
            <div className="p-8 md:p-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase">Try-On Studio</p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">Know the fit before it ships.</h2>
              <p className="mt-3 max-w-md text-white/75">Set your height, weight and body shape. We map each garment&apos;s size chart onto your avatar and show where it&apos;s snug or loose.</p>
              <Button asChild variant="gold" size="lg" className="mt-6">
                <Link href="/try-on">Open the studio</Link>
              </Button>
            </div>
            <div className="relative grid min-h-56 place-items-center bg-[radial-gradient(circle_at_50%_60%,#2B3C57,#0E1A2B_70%)] p-8">
              <div className="flex gap-6 text-xs">
                {[
                  ["#1F7A5A", "Good fit"],
                  ["#C8A24A", "Slightly loose"],
                  ["#B3261E", "Tight"],
                ].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Recommended */}
        <section>
          <SectionHeading title="Recommended for you" subtitle="Popular with shoppers like you, ranked by verified reviews and sales." action={<TrendingUp className="size-5 text-gold-text" aria-hidden />} />
          <ProductRail products={recommended} label="Recommended for you" />
        </section>

        <RecentlyViewed />

        {/* Seller CTA */}
        <Reveal>
          <section className="grid items-center gap-8 rounded-[12px] border border-sand bg-white p-8 md:grid-cols-[1.4fr_1fr] md:p-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Sell on Marqova</p>
              <h2 className="heading-display mt-2 text-3xl md:text-4xl">Unlimited listings. Transparent fees.</h2>
              <p className="mt-3 max-w-xl text-slate">
                List from a photo with AI, upload thousands of products by CSV, and get paid weekly. Your Trust Score — not your ad budget — decides how shoppers see you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="navy" size="lg">
                  <Link href="/sell">
                    <Store /> Start selling
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/seller/payouts">
                    <Wallet /> Fee calculator
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-3 text-sm">
              {["Verification in 1–2 business days", "Listing Quality Score with tips", "Seller API for inventory sync", "Sponsored listings, capped and clearly labelled"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-[8px] bg-sand-50 px-4 py-3">
                  <BadgeCheck className="size-4 shrink-0 text-emerald" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      </div>
    </>
  );
}
