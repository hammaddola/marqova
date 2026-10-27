import "server-only";
import { db } from "@/lib/db";
import type { WizardCategory, WizardInitial } from "@/components/seller/product-wizard";

/** Leaf categories with their attribute templates, for the add-product wizard. */
export async function getWizardCategories(): Promise<WizardCategory[]> {
  const cats = await db.category.findMany({
    where: { isActive: true, children: { none: {} } },
    orderBy: [{ parent: { position: "asc" } }, { position: "asc" }],
    select: { id: true, name: true, parent: { select: { name: true } }, attributes: { orderBy: { position: "asc" }, select: { key: true, label: true, type: true, options: true, required: true, variantAxis: true, unit: true } } },
  });
  return cats.map((c) => ({ id: c.id, name: c.name, parent: c.parent?.name ?? null, attributes: c.attributes }));
}

export async function getWizardProduct(storeId: string, id: string): Promise<WizardInitial | null> {
  const p = await db.product.findFirst({ where: { id, storeId }, include: { variants: { orderBy: { createdAt: "asc" } }, media: { orderBy: { position: "asc" } } } });
  if (!p) return null;
  const axisKeys = new Set(p.variants.flatMap((v) => Object.keys(v.options as object)));
  return {
    id: p.id,
    categoryId: p.categoryId,
    title: p.title,
    brand: p.brand ?? "",
    description: p.description,
    bullets: [...p.bullets, "", "", "", "", ""].slice(0, Math.max(5, p.bullets.length)),
    attributes: Object.fromEntries(Object.entries(p.attributes as Record<string, string | string[]>).filter(([k]) => !axisKeys.has(k))),
    tags: p.tags,
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, options: v.options as Record<string, string>, price: String(v.price / 100), compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice / 100) : "", stock: String(v.stock), isActive: v.isActive })),
    media: p.media.map((m) => ({ url: m.url, alt: m.alt, type: m.type })),
    shippingFee: String(p.shippingFee / 100),
    deliveryMinDays: String(p.deliveryMinDays),
    deliveryMaxDays: String(p.deliveryMaxDays),
    returnWindowDays: String(p.returnWindowDays),
  };
}
