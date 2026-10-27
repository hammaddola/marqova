import type { SearchParams, SortKey } from "@/server/search";

type Raw = Record<string, string | string[] | undefined>;

const SORT_KEYS = new Set(["relevance", "price_asc", "price_desc", "rating", "newest", "bestsellers", "trust"]);

const arr = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).map((s) => s.slice(0, 80)).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 120);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** URL → search params. Prices in the URL are whole rupees; attribute filters are `a_<key>`. */
export function parseSearchParams(raw: Raw, category?: string): SearchParams {
  const attrs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) if (k.startsWith("a_") && /^a_[a-zA-Z0-9]{1,30}$/.test(k)) attrs[k.slice(2)] = arr(v).slice(0, 20);
  const sort = one(raw.sort);
  const min = num(raw.min);
  const max = num(raw.max);
  return {
    q: one(raw.q)?.trim() || undefined,
    category: category ?? one(raw.category),
    minPrice: min ? Math.round(min * 100) : undefined,
    maxPrice: max ? Math.round(max * 100) : undefined,
    brands: arr(raw.brand).slice(0, 20),
    minRating: num(raw.rating),
    minTrust: num(raw.trust),
    fastDelivery: one(raw.fast) === "1",
    visual: one(raw.visual) === "1",
    attrs,
    sort: sort && SORT_KEYS.has(sort) ? (sort as SortKey) : undefined,
    page: Math.min(500, Math.max(1, Math.floor(num(raw.page) ?? 1))),
  };
}

export function activeFilterCount(p: SearchParams) {
  return (
    (p.minPrice ? 1 : 0) +
    (p.maxPrice ? 1 : 0) +
    (p.brands?.length ?? 0) +
    (p.minRating ? 1 : 0) +
    (p.minTrust ? 1 : 0) +
    (p.fastDelivery ? 1 : 0) +
    (p.visual ? 1 : 0) +
    Object.values(p.attrs ?? {}).reduce((s, v) => s + v.length, 0)
  );
}
