import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { LEGAL_DOCS } from "@/lib/legal";
import { siteUrl } from "@/lib/utils";
import { MULTI_SELLER } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Dynamic sitemap. For catalogs beyond ~50k URLs switch to generateSitemaps() chunks. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, stores] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 45_000 }),
    db.store.findMany({ where: { seller: { status: "APPROVED" } }, select: { slug: true } }),
  ]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/deals"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/try-on"), changeFrequency: "weekly", priority: 0.6 },
    ...(MULTI_SELLER ? [{ url: siteUrl("/sell"), changeFrequency: "monthly" as const, priority: 0.5 }] : []),
    { url: siteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/help"), changeFrequency: "monthly", priority: 0.4 },
    ...Object.keys(LEGAL_DOCS).map((d) => ({ url: siteUrl(`/legal/${d}`), changeFrequency: "yearly" as const, priority: 0.2 })),
    ...categories.map((c) => ({ url: siteUrl(`/c/${c.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...stores.map((s) => ({ url: siteUrl(`/store/${s.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...products.map((p) => ({ url: siteUrl(`/p/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
