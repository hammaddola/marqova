import Link from "next/link";
import { PlusSquare, Sparkles, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { Button } from "@/components/ui/button";
import { ListingsTable } from "@/components/seller/listings-table";
import type { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

export const metadata = { title: "Listings" };

const TABS = {
  all: { label: "All", where: {} },
  active: { label: "Active", where: { status: "ACTIVE" } },
  oos: { label: "Out of stock", where: { status: "ACTIVE", variants: { none: { stock: { gt: 0 }, isActive: true } } } },
  drafts: { label: "Drafts", where: { status: "DRAFT" } },
  attention: { label: "Needs attention", where: { OR: [{ status: "NEEDS_ATTENTION" }, { status: "REJECTED" }, { qualityScore: { lt: 50 } }] } },
  inactive: { label: "Inactive", where: { status: "INACTIVE" } },
} satisfies Record<string, { label: string; where: Prisma.ProductWhereInput }>;

const PAGE = 25;

export default async function ListingsPage({ searchParams }: PageProps<"/seller/listings">) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" && sp.tab in TABS ? sp.tab : "all") as keyof typeof TABS;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const base: Prisma.ProductWhereInput = { storeId: store.id, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}) };

  const [rows, counts] = await Promise.all([
    db.product.findMany({
      where: { ...base, ...TABS[tab].where },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, slug: true, title: true, status: true, basePrice: true, qualityScore: true, has3d: true, tryOnType: true, updatedAt: true, moderationNote: true,
        media: { where: { type: "IMAGE" }, take: 1, select: { url: true } },
        variants: { select: { stock: true, sku: true, isActive: true } },
        category: { select: { name: true } },
      },
    }),
    Promise.all(Object.entries(TABS).map(async ([k, t]) => [k, await db.product.count({ where: { ...base, ...t.where } })] as const)),
  ]);
  const next = rows.length > PAGE ? rows[PAGE - 1].id : null;
  const countMap = Object.fromEntries(counts);
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab, q: q || undefined, ...o })) if (v) p.set(k, v);
    return `/seller/listings?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Listings"
        subtitle="Unlimited products and variants."
        actions={
          <>
            <Button asChild variant="secondary" size="sm"><Link href="/seller/bulk"><Upload /> Bulk upload</Link></Button>
            <Button asChild variant="secondary" size="sm"><Link href="/seller/listings/ai"><Sparkles /> From a photo</Link></Button>
            <Button asChild variant="gold" size="sm"><Link href="/seller/listings/new"><PlusSquare /> Add product</Link></Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Listing status" className="flex gap-1 overflow-x-auto scrollbar-none">
          {Object.entries(TABS).map(([k, t]) => (
            <Link key={k} href={qs({ tab: k, cursor: undefined })} aria-current={tab === k ? "page" : undefined} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm", tab === k ? "bg-navy-900 font-semibold text-white" : "bg-white text-slate ring-1 ring-sand hover:text-ink")}>
              {t.label} <span className="ml-1 text-xs opacity-70">{countMap[k]}</span>
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/seller/listings">
          <input type="hidden" name="tab" value={tab} />
          <label htmlFor="lq" className="sr-only">Search listings</label>
          <input id="lq" name="q" defaultValue={q} placeholder="Search title or SKU" className="h-9 w-56 rounded-md border border-sand bg-white px-3 text-sm focus:border-gold-500 focus:outline-none" />
          <Button size="sm" variant="secondary" type="submit">Search</Button>
        </form>
      </div>
      <ListingsTable
        rows={rows.slice(0, PAGE).map((r) => ({
          id: r.id, slug: r.slug, title: r.title, status: r.status, price: r.basePrice, quality: r.qualityScore, has3d: r.has3d, tryOn: r.tryOnType !== "NONE",
          stock: r.variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0), variants: r.variants.length, sku: r.variants[0]?.sku ?? "", image: r.media[0]?.url ?? null,
          category: r.category.name, updatedAt: r.updatedAt.toISOString(), note: r.moderationNote,
        }))}
      />
      <div className="mt-4 flex justify-between">
        {cursor ? <Button asChild variant="secondary" size="sm"><Link href={qs({ cursor: undefined })}>First page</Link></Button> : <span />}
        {next && <Button asChild variant="secondary" size="sm"><Link href={qs({ cursor: next })}>Next page</Link></Button>}
      </div>
    </div>
  );
}
