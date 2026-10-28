import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion";
import { MULTI_SELLER } from "@/lib/marketplace";

export const metadata: Metadata = {
  title: "About Marqova",
  description: "A marketplace where reviews come only from real buyers, the full price is shown upfront and every seller is verified.",
  alternates: { canonical: "/about" },
};

// Each promise pairs what a shopper sees with the rule that enforces it; keep both true to the code.
const PROMISES = [
  {
    promise: "Every review comes from someone who bought the item",
    proof: "You can only review a product after your order is marked delivered. We also hold back reviews that arrive in suspicious bursts or repeat the same text, and nobody can pay for a better rating.",
  },
  {
    promise: "The price you see is the price you pay",
    proof: "Product cards show the delivery cost and an estimated delivery date before you open the page. Checkout adds nothing new, and orders over Rs 2,500 ship free with standard delivery.",
  },
  MULTI_SELLER
    ? {
        promise: "Every seller is checked before they can list",
        proof: "Sellers verify their identity and bank account with us first. After that they earn a public Trust Score from on-time delivery, returns, cancellations, buyer ratings and how quickly they reply, and you can open the breakdown on any score.",
      }
    : {
        promise: "One store answers for every order",
        proof: "Everything on Marqova is sold and shipped by Marqova itself, so there's one place to go for help, returns and refunds. Our own Trust Score is public, built from on-time delivery, returns, cancellations, buyer ratings and response time.",
      },
  {
    promise: "You can tell whether a deal is real",
    proof: "Every product page shows its price history, so a discount has to hold up against what the item actually sold for, not an invented “was” price.",
  },
  {
    promise: "You can check the fit before you buy",
    proof: "The Try-On Studio uses your height, weight and body shape to recommend a size and show where a garment will feel tight or roomy. Your measurements stay private to you and you can delete them at any time.",
  },
];

const SELLER_STEPS = [
  ["Apply", "A seller tells us who they are and what they sell: individual, registered business or brand owner."],
  ["Get verified", "We check their ID and bank account, usually within 1–2 business days. Nobody lists before this step is complete."],
  ["List clearly", "Each listing gets a quality score for its photos, details and specifications. Better listings are easier to find."],
  ["Earn trust", "Their Trust Score starts moving with their first deliveries, and it's visible to every shopper."],
];

const NEVER = [
  "Sell your personal data or your body measurements",
  "Accept payment for reviews or ratings",
  "Show a paid placement without a “Sponsored” label",
  "Hide who is responsible for your order",
  "Add fees at checkout that weren't on the product page",
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-navy-900 text-white">
        <Reveal className="container-page max-w-5xl py-16 md:py-20">
          <h1 className="font-display max-w-3xl text-4xl leading-tight font-semibold md:text-6xl">Shopping online should not take a leap of faith.</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/75">
            Marqova is a marketplace built around one question: can you trust what you&apos;re looking at? So we made the things that usually go unchecked
            (reviews, prices, sellers and fit) into rules that hold for every store.
          </p>
        </Reveal>
      </section>

      <section id="promises" className="container-page max-w-5xl scroll-mt-28 py-14">
        <h2 className="heading-display text-3xl">Our promises, and how we keep them</h2>
        <div className="mt-8 hidden grid-cols-[1fr_1.4fr] gap-8 border-b border-sand pb-3 text-sm font-semibold text-slate md:grid">
          <p>What you can expect</p>
          <p>What makes it true</p>
        </div>
        <dl>
          {PROMISES.map((p) => (
            <div key={p.promise} className="grid gap-2 border-b border-sand py-6 md:grid-cols-[1fr_1.4fr] md:gap-8">
              <dt className="font-display text-xl leading-snug font-semibold text-ink">{p.promise}</dt>
              <dd className="leading-relaxed text-slate">{p.proof}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-sand-50">
        <div className={`container-page grid max-w-5xl gap-12 py-14 ${MULTI_SELLER ? "md:grid-cols-[1.4fr_1fr]" : ""}`}>
          {MULTI_SELLER && (
          <div>
            <h2 className="heading-display text-3xl">How a seller gets on Marqova</h2>
            <ol className="mt-8 space-y-6">
              {SELLER_STEPS.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="grid size-10 place-items-center rounded-full bg-navy-900 font-semibold text-gold-500" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          )}
          <div>
            <h2 className="heading-display text-3xl">What we will never do</h2>
            <ul className="mt-8 space-y-4">
              {NEVER.map((n) => (
                <li key={n} className="border-l-2 border-crimson/60 pl-4 leading-snug">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="preview" className="container-page max-w-5xl scroll-mt-28 py-14">
        <h2 className="heading-display text-3xl">Why some pages say “preview”</h2>
        <div className="prose-marqova mt-4 max-w-3xl">
          <p>
            Marqova is opening in stages. {MULTI_SELLER ? "While our first sellers finish verification" : "While we finish stocking the store"}, the listings you can browse are previews: they show
            how products, prices, delivery dates and Trust Scores will look, but the items aren&apos;t for sale yet.
          </p>
          <p>
            You can still create an account, save your sizes and try the checkout. Orders placed during the preview aren&apos;t shipped and nobody is
            charged. The notice at the top of the page goes away automatically once real stores replace the previews.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {MULTI_SELLER && (
            <Button asChild variant="gold" size="lg">
              <Link href="/sell">Become a founding seller</Link>
            </Button>
          )}
          <Button asChild variant={MULTI_SELLER ? "secondary" : "gold"} size="lg">
            <Link href="/help">Visit the help centre</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
