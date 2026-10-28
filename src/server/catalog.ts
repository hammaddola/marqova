import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const productCardSelect = {
  id: true,
  slug: true,
  title: true,
  brand: true,
  basePrice: true,
  compareAtPrice: true,
  ratingAvg: true,
  ratingCount: true,
  shippingFee: true,
  deliveryMinDays: true,
  deliveryMaxDays: true,
  has3d: true,
  tryOnType: true,
  isSample: true,
  salesCount: true,
  store: { select: { name: true, slug: true, isVerified: true } },
  trustScore: { select: { score: true } },
  media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 2, select: { url: true, alt: true } },
  variants: { where: { isActive: true }, select: { stock: true }, take: 50 },
} satisfies Prisma.ProductSelect;

export type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  rating: number;
  ratingCount: number;
  shippingFee: number;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  storeName: string;
  storeVerified: boolean;
  trust: number | null;
  has3d: boolean;
  tryOn: boolean;
  inStock: boolean;
  isSample: boolean;
  sponsored?: boolean;
};

export function toCard(p: ProductCardRow, extra: Partial<ProductCardData> = {}): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    price: p.basePrice,
    compareAtPrice: p.compareAtPrice,
    rating: p.ratingAvg,
    ratingCount: p.ratingCount,
    shippingFee: p.shippingFee,
    deliveryMinDays: p.deliveryMinDays,
    deliveryMaxDays: p.deliveryMaxDays,
    image: p.media[0] ?? null,
    hoverImage: p.media[1] ?? null,
    storeName: p.store.name,
    storeVerified: p.store.isVerified,
    trust: p.trustScore?.score ?? null,
    has3d: p.has3d,
    tryOn: p.tryOnType !== "NONE",
    inStock: p.variants.some((v) => v.stock > 0),
    isSample: p.isSample,
    ...extra,
  };
}

export type CategoryNode = { id: string; name: string; slug: string; icon: string; parentId: string | null; children: CategoryNode[] };

export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const all = await db.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true, parentId: true },
    });
    const byId = new Map<string, CategoryNode>(all.map((c) => [c.id, { ...c, children: [] }]));
    const roots: CategoryNode[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(c);
      else roots.push(c);
    }
    return roots;
  },
  ["category-tree"],
  { tags: ["categories"], revalidate: 300 },
);

export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

export async function categoryWithDescendants(slug: string) {
  const tree = await getCategoryTree();
  const flat = flattenTree(tree);
  const node = flat.find((c) => c.slug === slug);
  if (!node) return null;
  return { node, ids: flattenTree([node]).map((c) => c.id), path: categoryPath(flat, node) };
}

export function categoryPath(flat: CategoryNode[], node: CategoryNode) {
  const path: CategoryNode[] = [node];
  let cur = node;
  while (cur.parentId) {
    const parent = flat.find((c) => c.id === cur.parentId);
    if (!parent) break;
    path.unshift(parent);
    cur = parent;
  }
  return path;
}

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({
    where: { slug },
    include: {
      store: { include: { trustScore: true, seller: { select: { tier: true } } } },
      category: { include: { attributes: { orderBy: { position: "asc" } } } },
      variants: { where: { isActive: true }, orderBy: { price: "asc" } },
      media: { orderBy: { position: "asc" } },
      trustScore: true,
      priceHistory: { orderBy: { recordedAt: "asc" }, take: 120 },
    },
  });
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

const ACTIVE = { status: "ACTIVE" } as const;

export async function getDeals(limit = 12) {
  const now = new Date();
  const promos = await db.promotion.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now }, product: ACTIVE },
    orderBy: { discountPercent: "desc" },
    take: limit,
    select: { endsAt: true, discountPercent: true, product: { select: productCardSelect } },
  });
  if (promos.length >= 4) return promos.map((p) => ({ ...toCard(p.product), dealEndsAt: p.endsAt.toISOString() }));
  const discounted = await db.product.findMany({
    where: { ...ACTIVE, compareAtPrice: { not: null } },
    orderBy: { salesCount: "desc" },
    take: limit,
    select: productCardSelect,
  });
  return discounted.map((p) => ({ ...toCard(p), dealEndsAt: null as string | null }));
}

export async function getBestsellers(limit = 12, categoryIds?: string[]) {
  const rows = await db.product.findMany({
    where: { ...ACTIVE, ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) },
    // Real orders first; until there are any, the most complete listings lead.
    orderBy: [{ salesCount: "desc" }, { ratingAvg: "desc" }, { qualityScore: "desc" }],
    take: limit,
    select: productCardSelect,
  });
  return rows.map((p) => toCard(p));
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { id: { in: ids }, ...ACTIVE }, select: productCardSelect });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map((p) => toCard(p));
}

export async function getSimilar(product: { id: string; categoryId: string; basePrice: number }, limit = 10) {
  const rows = await db.product.findMany({
    where: {
      ...ACTIVE,
      categoryId: product.categoryId,
      id: { not: product.id },
      basePrice: { gte: Math.round(product.basePrice * 0.5), lte: Math.round(product.basePrice * 1.8) },
    },
    orderBy: { ratingAvg: "desc" },
    take: limit,
    select: productCardSelect,
  });
  return rows.map((p) => toCard(p));
}

/** Products that co-occur in orders with this one, falling back to same-store items. */
export async function getFrequentlyBoughtTogether(product: { id: string; storeId: string; categoryId: string }, limit = 2) {
  const orders = await db.orderItem.findMany({ where: { productId: product.id }, select: { orderId: true }, take: 200, orderBy: { createdAt: "desc" } });
  const counts = new Map<string, number>();
  if (orders.length) {
    const co = await db.orderItem.findMany({
      where: { orderId: { in: orders.map((o) => o.orderId) }, productId: { not: product.id } },
      select: { productId: true },
    });
    for (const c of co) counts.set(c.productId, (counts.get(c.productId) ?? 0) + 1);
  }
  const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
  if (ids.length < limit) {
    const extra = await db.product.findMany({
      where: { ...ACTIVE, storeId: product.storeId, id: { notIn: [product.id, ...ids] }, categoryId: { not: product.categoryId } },
      take: limit - ids.length,
      select: { id: true },
      orderBy: { salesCount: "desc" },
    });
    ids.push(...extra.map((e) => e.id));
  }
  if (ids.length < limit) {
    const extra = await db.product.findMany({
      where: { ...ACTIVE, storeId: product.storeId, id: { notIn: [product.id, ...ids] } },
      take: limit - ids.length,
      select: { id: true },
      orderBy: { salesCount: "desc" },
    });
    ids.push(...extra.map((e) => e.id));
  }
  return getProductsByIds(ids);
}

/** Other stores selling a product with the same title/brand ("other sellers from Rs X"). */
export async function getOtherOffers(product: { id: string; title: string; brand: string | null }) {
  const rows = await db.product.findMany({
    where: { ...ACTIVE, id: { not: product.id }, title: { equals: product.title, mode: "insensitive" }, brand: product.brand },
    orderBy: { basePrice: "asc" },
    take: 5,
    select: { slug: true, basePrice: true, store: { select: { name: true } } },
  });
  return rows;
}

export async function getSponsored(categoryIds: string[] | null, excludeIds: string[], limit = 2) {
  const campaigns = await db.sponsoredCampaign.findMany({
    where: {
      active: true,
      product: { ...ACTIVE, id: { notIn: excludeIds }, ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) },
    },
    orderBy: { cpcBid: "desc" },
    take: limit,
    select: { id: true, product: { select: productCardSelect } },
  });
  // Spending is recorded on click, but impressions are counted here.
  if (campaigns.length) {
    await db.sponsoredCampaign.updateMany({ where: { id: { in: campaigns.map((c) => c.id) } }, data: { impressions: { increment: 1 } } });
  }
  return campaigns.map((c) => toCard(c.product, { sponsored: true }));
}
