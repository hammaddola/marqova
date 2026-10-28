import "server-only";
import { Meilisearch } from "meilisearch";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { categoryWithDescendants, productCardSelect, toCard, type ProductCardData } from "./catalog";

export const SORTS = {
  relevance: "Featured",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Avg. customer review",
  newest: "Newest arrivals",
  bestsellers: "Best sellers",
  trust: "Highest Trust Score",
} as const;
export type SortKey = keyof typeof SORTS;

export type SearchParams = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  minRating?: number;
  minTrust?: number;
  fastDelivery?: boolean;
  visual?: boolean; // 3D or try-on available
  attrs?: Record<string, string[]>;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export type SearchResult = { items: ProductCardData[]; total: number; page: number; pages: number; engine: "meilisearch" | "postgres" };

/** Search adapter interface: Meilisearch today, OpenSearch can implement the same contract later. */
export interface SearchAdapter {
  name: SearchResult["engine"];
  search(p: SearchParams & { categoryIds?: string[] }): Promise<{ ids: string[]; total: number }>;
  suggest(q: string, limit: number): Promise<{ title: string; slug: string }[]>;
  index(docs: SearchDocument[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

export type SearchDocument = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  description: string;
  tags: string[];
  categoryIds: string[];
  price: number;
  rating: number;
  trust: number;
  deliveryMaxDays: number;
  visual: boolean;
  salesCount: number;
  createdAt: number;
  attributes: Record<string, string | string[]>;
};

// ───────────────────────────── Postgres fallback ─────────────────────────────

const postgresAdapter: SearchAdapter = {
  name: "postgres",
  async search(p) {
    const where = buildWhere(p);
    const orderBy = sortToOrder(p.sort, !!p.q);
    const perPage = p.perPage ?? 24;
    const [rows, total] = await Promise.all([
      db.product.findMany({ where, orderBy, skip: ((p.page ?? 1) - 1) * perPage, take: perPage, select: { id: true } }),
      db.product.count({ where }),
    ]);
    return { ids: rows.map((r) => r.id), total };
  },
  async suggest(q, limit) {
    return db.product.findMany({
      where: { status: "ACTIVE", OR: [{ title: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }] },
      select: { title: true, slug: true },
      orderBy: { salesCount: "desc" },
      take: limit,
    });
  },
  async index() {},
  async remove() {},
};

export function buildWhere(p: SearchParams & { categoryIds?: string[] }): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
  if (p.q) {
    const terms = p.q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const t of terms) {
      and.push({
        OR: [
          { title: { contains: t, mode: "insensitive" } },
          { brand: { contains: t, mode: "insensitive" } },
          { tags: { has: t.toLowerCase() } },
          { category: { name: { contains: t, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (p.categoryIds?.length) and.push({ categoryId: { in: p.categoryIds } });
  if (p.minPrice != null) and.push({ basePrice: { gte: p.minPrice } });
  if (p.maxPrice != null) and.push({ basePrice: { lte: p.maxPrice } });
  if (p.brands?.length) and.push({ brand: { in: p.brands } });
  if (p.minRating) and.push({ ratingAvg: { gte: p.minRating } });
  if (p.minTrust) and.push({ trustScore: { score: { gte: p.minTrust } } });
  if (p.fastDelivery) and.push({ deliveryMaxDays: { lte: 2 } });
  if (p.visual) and.push({ OR: [{ has3d: true }, { tryOnType: { not: "NONE" } }] });
  for (const [key, values] of Object.entries(p.attrs ?? {})) {
    if (!values.length) continue;
    and.push({
      OR: values.flatMap((v) => [
        { attributes: { path: [key], equals: v } },
        { attributes: { path: [key], array_contains: [v] } },
      ]),
    });
  }
  return { AND: and };
}

function sortToOrder(sort: SortKey | undefined, hasQuery: boolean): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ basePrice: "asc" }];
    case "price_desc":
      return [{ basePrice: "desc" }];
    case "rating":
      return [{ ratingAvg: "desc" }, { ratingCount: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "trust":
      return [{ trustScore: { score: "desc" } }, { salesCount: "desc" }];
    case "bestsellers":
      return [{ salesCount: "desc" }, { qualityScore: "desc" }];
    default:
      return hasQuery ? [{ salesCount: "desc" }, { ratingAvg: "desc" }] : [{ qualityScore: "desc" }, { salesCount: "desc" }];
  }
}

// ───────────────────────────── Meilisearch ─────────────────────────────

const INDEX = "products";

function meiliAdapter(client: Meilisearch): SearchAdapter {
  const index = client.index<SearchDocument>(INDEX);
  const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  return {
    name: "meilisearch",
    async search(p) {
      const filter: string[] = [];
      if (p.categoryIds?.length) filter.push(`categoryIds IN [${p.categoryIds.map(quote).join(",")}]`);
      if (p.minPrice != null) filter.push(`price >= ${p.minPrice}`);
      if (p.maxPrice != null) filter.push(`price <= ${p.maxPrice}`);
      if (p.brands?.length) filter.push(`brand IN [${p.brands.map(quote).join(",")}]`);
      if (p.minRating) filter.push(`rating >= ${p.minRating}`);
      if (p.minTrust) filter.push(`trust >= ${p.minTrust}`);
      if (p.fastDelivery) filter.push(`deliveryMaxDays <= 2`);
      if (p.visual) filter.push(`visual = true`);
      for (const [k, vs] of Object.entries(p.attrs ?? {})) if (vs.length) filter.push(`attributes.${k} IN [${vs.map(quote).join(",")}]`);
      const sortMap: Partial<Record<SortKey, string[]>> = {
        price_asc: ["price:asc"],
        price_desc: ["price:desc"],
        rating: ["rating:desc"],
        newest: ["createdAt:desc"],
        bestsellers: ["salesCount:desc"],
        trust: ["trust:desc"],
      };
      const perPage = p.perPage ?? 24;
      const res = await index.search(p.q ?? "", {
        filter,
        sort: p.sort ? sortMap[p.sort] : undefined,
        hitsPerPage: perPage,
        page: p.page ?? 1,
        attributesToRetrieve: ["id"],
      });
      return { ids: res.hits.map((h) => h.id), total: res.totalHits ?? res.hits.length };
    },
    async suggest(q, limit) {
      const res = await index.search(q, { limit, attributesToRetrieve: ["title", "slug"] });
      return res.hits.map((h) => ({ title: h.title, slug: h.slug }));
    },
    async index(docs) {
      await index.addDocuments(docs, { primaryKey: "id" });
    },
    async remove(ids) {
      await index.deleteDocuments(ids);
    },
  };
}

export async function configureMeiliIndex(client: Meilisearch, attributeKeys: string[]) {
  await client.createIndex(INDEX, { primaryKey: "id" }).catch(() => {});
  const index = client.index(INDEX);
  await index.updateSettings({
    searchableAttributes: ["title", "brand", "tags", "description"],
    filterableAttributes: ["categoryIds", "price", "brand", "rating", "trust", "deliveryMaxDays", "visual", ...attributeKeys.map((k) => `attributes.${k}`)],
    sortableAttributes: ["price", "rating", "createdAt", "salesCount", "trust"],
    typoTolerance: { enabled: true },
  });
}

export function getMeiliClient() {
  return process.env.MEILI_HOST ? new Meilisearch({ host: process.env.MEILI_HOST, apiKey: process.env.MEILI_MASTER_KEY }) : null;
}

export function getSearchAdapter(): SearchAdapter {
  const client = getMeiliClient();
  return client ? meiliAdapter(client) : postgresAdapter;
}

// ───────────────────────────── Public API ─────────────────────────────

export async function searchProducts(p: SearchParams): Promise<SearchResult & { categoryIds: string[] | null }> {
  const cat = p.category ? await categoryWithDescendants(p.category) : null;
  const categoryIds = cat?.ids ?? null;
  const perPage = p.perPage ?? 24;
  const params = { ...p, categoryIds: categoryIds ?? undefined, perPage };
  let adapter = getSearchAdapter();
  let found: { ids: string[]; total: number };
  try {
    found = await adapter.search(params);
  } catch (err) {
    // Degrade gracefully when the search engine is unreachable.
    console.warn("[search] falling back to postgres:", (err as Error).message);
    adapter = postgresAdapter;
    found = await adapter.search(params);
  }
  const rows = found.ids.length ? await db.product.findMany({ where: { id: { in: found.ids } }, select: productCardSelect }) : [];
  const order = new Map(found.ids.map((id, i) => [id, i]));
  const items = rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map((r) => toCard(r));
  return { items, total: found.total, page: p.page ?? 1, pages: Math.max(1, Math.ceil(found.total / perPage)), engine: adapter.name, categoryIds };
}

export async function suggest(q: string) {
  const adapter = getSearchAdapter();
  try {
    return await adapter.suggest(q, 8);
  } catch {
    return postgresAdapter.suggest(q, 8);
  }
}

/** Facets for the filter sidebar, computed from the current category (or whole catalog). */
export async function getFacets(categoryIds: string[] | null, categoryId?: string) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) };
  const [brands, price, attributeDefs] = await Promise.all([
    db.product.groupBy({ by: ["brand"], where: { ...where, brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 15 }),
    db.product.aggregate({ where, _min: { basePrice: true }, _max: { basePrice: true } }),
    categoryId
      ? db.attributeDefinition.findMany({ where: { categoryId, filterable: true, type: { in: ["SELECT", "MULTISELECT", "COLOR", "SIZE", "BOOLEAN"] } }, orderBy: { position: "asc" } })
      : Promise.resolve([]),
  ]);
  return {
    brands: brands.map((b) => ({ value: b.brand!, count: b._count._all })),
    priceRange: { min: price._min.basePrice ?? 0, max: price._max.basePrice ?? 0 },
    attributes: attributeDefs.map((a) => ({ key: a.key, label: a.label, type: a.type, options: a.type === "BOOLEAN" ? ["Yes"] : a.options })),
  };
}

export async function buildSearchDocuments(where: Prisma.ProductWhereInput = { status: "ACTIVE" }): Promise<SearchDocument[]> {
  const rows = await db.product.findMany({
    where,
    select: {
      id: true, title: true, slug: true, brand: true, description: true, tags: true, basePrice: true, ratingAvg: true,
      deliveryMaxDays: true, has3d: true, tryOnType: true, salesCount: true, createdAt: true, attributes: true,
      category: { select: { id: true, parentId: true } },
      trustScore: { select: { score: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    brand: r.brand,
    description: r.description.slice(0, 2000),
    tags: r.tags,
    categoryIds: [r.category.id, r.category.parentId].filter((x): x is string => !!x),
    price: r.basePrice,
    rating: r.ratingAvg,
    trust: r.trustScore?.score ?? 0,
    deliveryMaxDays: r.deliveryMaxDays,
    visual: r.has3d || r.tryOnType !== "NONE",
    salesCount: r.salesCount,
    createdAt: r.createdAt.getTime(),
    attributes: (r.attributes ?? {}) as Record<string, string | string[]>,
  }));
}
