import Link from "next/link";
import { ShieldCheck, BadgeCheck, Receipt, RotateCcw } from "lucide-react";
import { Logo } from "@/components/brand";
import { MULTI_SELLER } from "@/lib/marketplace";

const COLUMNS = [
  { title: "Get to know us", links: [["About Marqova", "/about"], ["Our promises", "/about#promises"], ["Trust Score explained", "/legal/trust-score"]] },
  { title: "Shop", links: [["Today's Deals", "/deals"], ["Try-On Studio", "/try-on"], ["All categories", "/search"]] },
  { title: "Sell", links: [["Sell on Marqova", "/sell"], ["Seller Hub", "/seller"], ["Seller agreement", "/legal/seller-agreement"], ["Fee calculator", "/sell"]] },
  { title: "Help", links: [["Help centre", "/help"], ["Your orders", "/account/orders"], ["Returns policy", "/legal/returns"], ["Privacy", "/legal/privacy"], ["Terms of use", "/legal/terms"]] },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-navy-900 text-white">
      <div className="border-b border-white/10">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            MULTI_SELLER ? [BadgeCheck, "Verified sellers", "Every store is checked"] : [BadgeCheck, "Sold by Marqova", "One store answers for every order"],
            [ShieldCheck, "Real reviews only", "From delivered orders"],
            [Receipt, "Full price upfront", "No surprises at checkout"],
            [RotateCcw, "Easy returns", "Clear policy on every item"],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof BadgeCheck;
            return (
              <div key={title as string} className="flex items-start gap-3">
                <I className="mt-0.5 size-5 shrink-0 text-gold-500" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{title as string}</p>
                  <p className="text-xs text-white/65">{body as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`container-page grid gap-10 py-12 ${MULTI_SELLER ? "md:grid-cols-[1.3fr_repeat(4,1fr)]" : "md:grid-cols-[1.3fr_repeat(3,1fr)]"}`}>
        <div>
          <Logo dark />
          <p className="mt-3 max-w-xs text-sm text-white/70">See it. Trust it. Own it. Shopping for every niche, built on real reviews and honest prices.</p>
        </div>
        {COLUMNS.filter((col) => MULTI_SELLER || col.title !== "Sell").map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-semibold">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="focus-dark rounded text-sm text-white/70 transition-colors hover:text-gold-500">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Marqova</p>
          <p>Prices in Pakistani rupees (Rs) and include all fees shown at checkout.</p>
        </div>
      </div>
    </footer>
  );
}
