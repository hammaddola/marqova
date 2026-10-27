import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";
import { SideNav } from "./side-nav";

type Item = { href: string; label: string; icon: string; badge?: number };

/** Shared shell for Seller Hub and the Admin panel. */
export function ConsoleShell({ area, user, items, children }: { area: string; user: string; items: Item[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-40 bg-navy-900 text-white print:hidden">
        <div className="container-page flex h-14 items-center gap-4">
          <Logo dark className="text-[22px]" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-500">{area}</span>
          <span className="ml-auto hidden text-sm text-white/70 sm:block">{user}</span>
          <Link href="/" className="focus-dark flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-white/10">
            <ArrowLeft className="size-4" aria-hidden /> Store
          </Link>
        </div>
      </header>
      <div className="container-page grid flex-1 gap-8 py-6 lg:grid-cols-[230px_1fr]">
        <div className="print:hidden">
          <SideNav title={area} items={items} />
        </div>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="heading-display text-2xl md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
