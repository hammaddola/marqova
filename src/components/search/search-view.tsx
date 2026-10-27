import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { ProductGrid } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ActiveChips, FilterDrawer, FilterSidebar, SortAndView } from "./filters";
import { activeFilterCount } from "@/lib/search-params";
import { formatPrice, cn } from "@/lib/utils";
import { getFacets, searchProducts, SORTS, type SearchParams } from "@/server/search";
import { getSponsored } from "@/server/catalog";

type Raw = Record<string, string | string[] | undefined>;

/** Shared results UI for /search and /c/[category]. Sponsored results are capped at 2 per page and labelled. */
export async function SearchView({ params, raw, basePath, heading, subheading, categoryId, categoryLinks }: { params: SearchParams; raw: Raw; basePath: string; heading: string; subheading?: string; categoryId?: string; categoryLinks?: React.ReactNode }) {
  const result = await searchProducts(params);
  const [facets, sponsored] = await Promise.all([
    getFacets(result.categoryIds, categoryId),
    result.page === 1 && result.items.length ? getSponsored(result.categoryIds, result.items.map((i) => i.id), 2) : Promise.resolve([]),
  ]);
  const view = raw.view === "list" ? "list" : "grid";
  const items = [...sponsored.slice(0, 2), ...result.items];

  const chips = [
    ...(params.brands ?? []).map((b) => ({ key: "brand", value: b, label: b })),
    ...Object.entries(params.attrs ?? {}).flatMap(([k, vs]) => vs.map((v) => ({ key: `a_${k}`, value: v, label: v }))),
    ...(params.minRating ? [{ key: "rating", value: String(params.minRating), label: `${params.minRating}★ & up` }] : []),
    ...(params.minTrust ? [{ key: "trust", value: String(params.minTrust), label: `Trust ${params.minTrust}+` }] : []),
    ...(params.fastDelivery ? [{ key: "fast", value: "1", label: "1–2 day delivery" }] : []),
    ...(params.visual ? [{ key: "visual", value: "1", label: "3D / Try-on" }] : []),
    ...(params.minPrice ? [{ key: "min", value: String(params.minPrice / 100), label: `From ${formatPrice(params.minPrice)}` }] : []),
    ...(params.maxPrice ? [{ key: "max", value: String(params.maxPrice / 100), label: `Up to ${formatPrice(params.maxPrice)}` }] : []),
  ];

  const pageHref = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) (Array.isArray(v) ? v : v ? [v] : []).forEach((x) => sp.append(k, x));
    if (page > 1) sp.set("page", String(page));
    else sp.delete("page");
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex gap-8">
      <Suspense>
        <FilterSidebar facets={facets} activeCount={activeFilterCount(params)} categoryLinks={categoryLinks} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="heading-display text-2xl md:text-3xl">{heading}</h1>
            <p className="mt-1 text-sm text-slate" aria-live="polite">
              {result.total.toLocaleString()} result{result.total === 1 ? "" : "s"}
              {subheading ? ` · ${subheading}` : ""}
            </p>
          </div>
          <Suspense>
            <div className="flex items-center gap-2">
              <FilterDrawer facets={facets} activeCount={activeFilterCount(params)} categoryLinks={categoryLinks} />
              <SortAndView sorts={SORTS} current={params.sort ?? "relevance"} view={view} />
            </div>
          </Suspense>
        </div>
        <Suspense>
          <div className="mb-4">
            <ActiveChips chips={chips} />
          </div>
        </Suspense>

        {items.length ? (
          <>
            <h2 className="sr-only">Products</h2>
            <ProductGrid products={items} layout={view} />
            {result.pages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
                <Button asChild variant="secondary" size="sm" className={cn(result.page <= 1 && "pointer-events-none opacity-40")}>
                  <Link href={pageHref(result.page - 1)} aria-disabled={result.page <= 1} rel="prev">
                    <ChevronLeft /> Prev
                  </Link>
                </Button>
                {pageWindow(result.page, result.pages).map((p, i) =>
                  p === 0 ? (
                    <span key={`gap-${i}`} className="px-2 text-slate">…</span>
                  ) : (
                    <Link key={p} href={pageHref(p)} aria-current={p === result.page ? "page" : undefined} className={cn("grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-medium", p === result.page ? "bg-navy-900 text-white" : "hover:bg-sand-50")}>
                      {p}
                    </Link>
                  ),
                )}
                <Button asChild variant="secondary" size="sm" className={cn(result.page >= result.pages && "pointer-events-none opacity-40")}>
                  <Link href={pageHref(result.page + 1)} aria-disabled={result.page >= result.pages} rel="next">
                    Next <ChevronRight />
                  </Link>
                </Button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState icon={<SearchX />} title="No matches yet" body="Try fewer filters, a broader word, or ask the shopping assistant in plain language." action={<Button asChild variant="navy"><Link href={basePath}>Clear filters</Link></Button>} />
        )}
      </div>
    </div>
  );
}

function pageWindow(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(0);
    out.push(p);
  });
  return out;
}
