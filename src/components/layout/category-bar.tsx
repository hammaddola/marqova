"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Sparkles, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/overlay";
import { CategoryIcon } from "@/components/category-icon";
import { AnimatePresence, motion } from "@/components/motion";
import { cn } from "@/lib/utils";
import { MULTI_SELLER } from "@/lib/marketplace";

type Cat = { name: string; slug: string; icon: string; children: { name: string; slug: string }[] };

export function CategoryBar({ categories }: { categories: Cat[] }) {
  const [mega, setMega] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const top = categories.slice(0, 7);
  const linkCls = "focus-dark shrink-0 rounded px-2.5 py-1.5 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <nav aria-label="Categories" className="relative bg-navy-700 text-white" onMouseLeave={() => setMega(false)}>
      <div className="container-page flex h-11 items-center gap-1 overflow-x-auto scrollbar-none">
        {/* Mobile: drawer */}
        <Drawer direction="left">
          <DrawerTrigger className={cn(linkCls, "flex items-center gap-1.5 font-semibold lg:hidden")}>
            <Menu className="size-4" aria-hidden /> All
          </DrawerTrigger>
          <DrawerContent title="Shop by category" side="left">
            <ul className="p-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover:bg-sand-50">
                      <CategoryIcon name={c.icon} className="size-4 text-gold-text" />
                      {c.name}
                      <ChevronRight className="ml-auto size-4 text-slate transition-transform group-open:rotate-90" aria-hidden />
                    </summary>
                    <ul className="mb-2 ml-10 border-l border-sand pl-3">
                      <li>
                        <Link href={`/c/${c.slug}`} className="block py-2 text-sm font-semibold text-gold-text">
                          All {c.name}
                        </Link>
                      </li>
                      {c.children.map((s) => (
                        <li key={s.slug}>
                          <Link href={`/c/${s.slug}`} className="block py-2 text-sm text-ink hover:text-gold-text">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </DrawerContent>
        </Drawer>

        {/* Desktop: mega-menu */}
        <button
          type="button"
          className={cn(linkCls, "hidden items-center gap-1.5 font-semibold lg:flex", mega && "bg-white/10")}
          aria-expanded={mega}
          aria-controls="mega-menu"
          onClick={() => setMega((m) => !m)}
          onMouseEnter={() => setMega(true)}
        >
          <Menu className="size-4" aria-hidden /> All
        </button>
        <Link href="/deals" className={linkCls}>
          Today&apos;s Deals
        </Link>
        {top.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className={cn(linkCls, "hidden md:block")}>
            {c.name}
          </Link>
        ))}
        <span className="ml-auto" />
        <Link href="/try-on" className="focus-dark flex shrink-0 items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-[13px] font-semibold text-navy-900 transition-colors hover:bg-gold-300">
          <Sparkles className="size-3.5" aria-hidden /> Try-On Studio
        </Link>
        {MULTI_SELLER && (
          <Link href="/sell" className={linkCls}>
            Sell on Marqova
          </Link>
        )}
      </div>

      <AnimatePresence>
        {mega && (
          <motion.div
            id="mega-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full z-50 hidden border-t border-white/10 bg-white text-ink shadow-[var(--shadow-lift)] lg:block"
            onKeyDown={(e) => e.key === "Escape" && setMega(false)}
          >
            <div className="container-page grid grid-cols-[280px_1fr] gap-8 py-6">
              <ul className="border-r border-sand pr-4" role="list">
                {categories.map((c, i) => (
                  <li key={c.slug}>
                    <Link
                      href={`/c/${c.slug}`}
                      onMouseEnter={() => setActiveIdx(i)}
                      onFocus={() => setActiveIdx(i)}
                      onClick={() => setMega(false)}
                      className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", i === activeIdx ? "bg-sand-50 font-semibold" : "hover:bg-sand-50")}
                    >
                      <CategoryIcon name={c.icon} className="size-4 text-gold-text" />
                      {c.name}
                      <ChevronRight className="ml-auto size-4 text-slate" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              {categories[activeIdx] && (
                <div>
                  <p className="heading-display mb-4 text-2xl">{categories[activeIdx].name}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {categories[activeIdx].children.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/c/${s.slug}`}
                        onClick={() => setMega(false)}
                        className="rounded-[8px] border border-sand p-4 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-[var(--shadow-card)]"
                      >
                        {s.name}
                        <span className="mt-1 block text-xs font-normal text-slate">Shop now →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
