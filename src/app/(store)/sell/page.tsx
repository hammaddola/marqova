import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Camera, FileSpreadsheet, KeyRound, LineChart, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { FeeCalculator } from "@/components/seller/fee-calculator";
import { db } from "@/lib/db";
import { MULTI_SELLER } from "@/lib/marketplace";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Sell on Marqova",
  description: "Unlimited listings, AI listing from a photo, bulk CSV upload, transparent fees and weekly payouts.",
  alternates: { canonical: "/sell" },
};

const FEATURES = [
  [Camera, "List from a photo", "Upload photos and AI drafts the title, bullets, attributes and tags for you to review."],
  [FileSpreadsheet, "Bulk upload", "Category templates for Excel/CSV with a row-by-row validation report."],
  [LineChart, "Real analytics", "Views, conversion, traffic sources and top products — no extra charge."],
  [ShieldCheck, "Trust Score", "Earn visibility by delivering on time, not by out-bidding on ads."],
  [KeyRound, "Seller API", "Sync listings and inventory from your own systems with API keys."],
  [Wallet, "Weekly payouts", "Transparent fee breakdown on every order, paid to your verified bank."],
] as const;

export default async function SellPage() {
  if (!MULTI_SELLER) notFound();
  const categories = await db.category.findMany({ where: { parentId: null, isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true, commissionBps: true } });
  return (
    <div>
      <section className="bg-navy-900 text-white">
        <div className="container-page grid items-center gap-10 py-16 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase">Sell on Marqova</p>
            <h1 className="font-display mt-3 text-4xl font-semibold md:text-5xl">Your store, trusted from day one.</h1>
            <p className="mt-4 max-w-lg text-white/75">Unlimited listings in every niche. Verification in 1–2 business days. Fees you can calculate before you list.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/seller/onboarding">Start selling</Link>
              </Button>
              <Button asChild variant="outlineLight" size="lg">
                <Link href="/legal/seller-agreement">Read the seller agreement</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <FeeCalculator categories={categories.map((c) => ({ id: c.id, name: c.name, commissionBps: c.commissionBps }))} dark />
          </Reveal>
        </div>
      </section>
      <section className="container-page py-14">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([Icon, title, body]) => (
            <StaggerItem key={title} className="rounded-[8px] border border-sand bg-white p-6">
              <Icon className="size-6 text-gold-text" aria-hidden />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate">{body}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["Individual", "Sell occasionally or start small. ID and bank verification."],
            ["Business", "Registered businesses. Bulk tools, multi-warehouse and API."],
            ["Brand", "Brand owners. Brand store page and counterfeit protection."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-[8px] bg-sand-50 p-6">
              <p className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="size-4 text-emerald" aria-hidden /> {t}
              </p>
              <p className="mt-1 text-sm text-slate">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
