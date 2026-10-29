import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { MULTI_SELLER } from "@/lib/marketplace";
import { FAQ } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers about ordering, delivery, payment, returns, sizing, your account and selling on Marqova.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  const topics = FAQ.filter((t) => MULTI_SELLER || t.id !== "selling");
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
                    <div className="pb-5 leading-relaxed text-slate">
                      {item.a}
                      {item.link && (
                        <>
                          {" "}
                          <Link href={item.link.href} className="font-medium text-gold-text underline">
                            {item.link.label}
                          </Link>
                        </>
                      )}
                    </div>
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
