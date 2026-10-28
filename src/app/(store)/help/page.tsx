import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { MULTI_SELLER } from "@/lib/marketplace";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers about ordering, delivery, payment, returns, sizing, your account and selling on Marqova.",
  alternates: { canonical: "/help" },
};

type QA = { q: string; a: React.ReactNode };

// Answers describe what the site does today; update them alongside the feature they describe.
const TOPICS: { id: string; title: string; items: QA[] }[] = [
  {
    id: "orders",
    title: "Ordering and delivery",
    items: [
      {
        q: "How do I know what delivery will cost?",
        a: "Every product card shows its delivery fee and an estimated delivery date for your city. Standard delivery is free on orders of Rs 2,500 or more. Express delivery costs Rs 350 extra and usually arrives in 1–2 business days.",
      },
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 2–5 business days, and each seller's own dispatch time is included in the date you see. Deliveries to Gilgit, Skardu, Quetta, Gwadar and Chitral can take up to 2 days longer. Sundays don't count as business days.",
      },
      {
        q: "Where can I see my order?",
        a: (
          <>
            Go to <Link href="/account/orders">Your orders</Link>. Each order shows its status for every item: placed, accepted by the seller, shipped or
            delivered.
          </>
        ),
      },
      {
        q: "Can I change the delivery city?",
        a: "Yes. Use “Deliver to” at the top of any page. Prices, delivery fees and dates update for the city you choose.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    items: [
      {
        q: "Which payment methods can I use?",
        a: "Cash on delivery is available on every order. Card payments are handled by a licensed payment provider on its own secure page, and Marqova never sees or stores your card number.",
      },
      {
        q: "Will I be charged anything extra at checkout?",
        a: "No. The total at checkout is the item price plus the delivery fee you were already shown. Taxes are included in the item price.",
      },
      {
        q: "How do discount codes work?",
        a: "Enter a code in your cart. Some codes need a minimum order amount, and some only apply to one store. The cart tells you exactly why a code doesn't apply.",
      },
    ],
  },
  {
    id: "returns",
    title: "Returns and refunds",
    items: [
      {
        q: "How long do I have to return something?",
        a: "Each product shows its return window next to the Add to Cart button, typically 7–30 days from delivery. Items must be unused and in their original packaging unless they arrived faulty.",
      },
      {
        q: "How do I start a return?",
        a: (
          <>
            Open the order in <Link href="/account/orders">Your orders</Link> and choose “Return item”. You can follow every return in{" "}
            <Link href="/account/returns">Returns</Link>. The seller has 2 business days to respond. If they don&apos;t, Marqova reviews the request
            itself.
          </>
        ),
      },
      {
        q: "When will I get my money back?",
        a: "Within 5 business days of the seller receiving the item, to the payment method you used. For cash on delivery orders we refund to your bank account or mobile wallet.",
      },
      {
        q: "What if my order never arrives?",
        a: "If an item doesn't arrive, or is significantly different from its description, Marqova Buyer Protection refunds you in full.",
      },
    ],
  },
  {
    id: "sizing",
    title: "Sizing and try-on",
    items: [
      {
        q: "How does the size recommendation work?",
        a: (
          <>
            Save your height, weight and body shape once in the <Link href="/try-on">Try-On Studio</Link>. Clothing and shoe pages then recommend a size
            and show where it will feel tight, good or roomy, based on the product&apos;s size chart.
          </>
        ),
      },
      {
        q: "Who can see my measurements?",
        a: (
          <>
            Only you. Sellers never see them. You can delete them at any time in <Link href="/account/avatars">Sizes and avatars</Link>, and they are
            removed permanently.
          </>
        ),
      },
      {
        q: "What does “View in 3D” do?",
        a: "Some products include a 3D model you can rotate and zoom. On most phones, the AR button inside the 3D viewer places the item in your room using your camera.",
      },
    ],
  },
  {
    id: "trust",
    title: "Reviews and seller trust",
    items: [
      {
        q: "Why does a product have no reviews?",
        a: "Only shoppers whose order was delivered can review a product, so new listings start with none. We never add reviews ourselves or let sellers buy them.",
      },
      {
        q: "What is the Trust Score?",
        a: (
          <>
            A score from 0 to 100 built from on-time delivery, return and cancellation rates, buyer ratings and how quickly the seller replies. Open any
            score to see its breakdown, or read <Link href="/legal/trust-score">how the Trust Score works</Link>.
          </>
        ),
      },
      {
        q: "How do I ask a seller something?",
        a: "Ask on the product page under Questions and answers, where the seller and verified owners can reply, or message the seller from their store page. Your conversations are kept in Messages in your account.",
      },
    ],
  },
  {
    id: "account",
    title: "Your account",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No, you can check out as a guest. With an account you can track orders, save addresses and sizes, keep a wishlist and get price-drop alerts.",
      },
      {
        q: "How do price alerts work?",
        a: (
          <>
            On any product page, choose “Set a price alert” and pick a target price. You&apos;ll find your alerts in{" "}
            <Link href="/account/alerts">Price alerts</Link>.
          </>
        ),
      },
      {
        q: "I forgot my password",
        a: "Password reset by email arrives before our full launch. During the preview, create a new account; nothing you've saved so far involves real orders or payments.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling on Marqova",
    items: [
      {
        q: "Who can sell?",
        a: (
          <>
            Individuals, registered businesses and brand owners. Every seller verifies their ID and bank account before listing.{" "}
            <Link href="/sell">Start on the Sell page</Link>.
          </>
        ),
      },
      {
        q: "What does it cost?",
        a: "There's no monthly fee. Each sale has a category commission, a fixed per-item fee and a payment processing fee. The fee calculator on the Sell page shows the exact amount before you list.",
      },
      {
        q: "When do I get paid?",
        a: "Payouts are weekly to your verified bank account, with a full breakdown of fees and refunds for every order.",
      },
    ],
  },
];

export default function HelpPage() {
  const topics = TOPICS.filter((t) => MULTI_SELLER || t.id !== "selling");
  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="heading-display text-4xl">Help centre</h1>
      <p className="mt-2 max-w-2xl text-slate">Answers to the questions shoppers and sellers ask most.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Help topics" className="lg:sticky lg:top-32 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col lg:gap-1">
            {topics.map((t) => (
              <li key={t.id} className="shrink-0">
                <a href={`#${t.id}`} className="block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-slate hover:bg-sand-50 hover:text-ink max-lg:border max-lg:border-sand">
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-12">
          {topics.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-28" aria-labelledby={`${t.id}-h`}>
              <h2 id={`${t.id}-h`} className="heading-display text-2xl">
                {t.title}
              </h2>
              <div className="mt-4 divide-y divide-sand border-y border-sand">
                {t.items.map((item) => (
                  <details key={item.q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium hover:text-gold-text [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="size-4 shrink-0 text-slate transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                    </summary>
                    <div className="pb-5 leading-relaxed text-slate [&_a]:font-medium [&_a]:text-gold-text [&_a]:underline">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <section id="contact" className="scroll-mt-28 rounded-[8px] bg-navy-900 p-6 text-white md:p-8">
            <h2 className="heading-display text-2xl">Still need help?</h2>
            <p className="mt-2 max-w-xl text-white/75">
              {MULTI_SELLER
                ? "For questions about an order, open the item from your order, choose “Visit” with the store’s name, and message the seller from their store page. Every store shows its typical response time, and that time counts towards its Trust Score."
                : "Message us from the Marqova store page with “Contact seller” (you'll need to sign in). Replies arrive in Messages in your account, and our typical response time is shown on the store page."}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {!MULTI_SELLER && (
                <Link href="/store/marqova" className="font-semibold text-gold-500 underline underline-offset-2">
                  Message Marqova
                </Link>
              )}
              <Link href="/account/messages" className="font-semibold text-gold-500 underline underline-offset-2">
                Go to your messages
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
