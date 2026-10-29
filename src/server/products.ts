import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { listingQuality } from "@/lib/listing-quality";
import { randomToken, slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validation";
import { enqueue, PRIORITY } from "./jobs";

/**
 * Creates or updates a product with its variants, media and inventory.
 * Shared by the add-product wizard, the AI photo flow and the Seller API.
 * Prices in `input` are in rupees; they are stored in minor units.
 */
export async function saveProduct(storeId: string, input: ProductInput) {
  const category = await db.category.findUnique({ where: { id: input.categoryId }, include: { attributes: true } });
  if (!category) throw new Error("Unknown category");
  const existing = input.id ? await db.product.findFirst({ where: { id: input.id, storeId }, include: { variants: true } }) : null;
  if (input.id && !existing) throw new Error("Product not found");

  const skus = input.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) throw new Error("Each variant needs a unique SKU");
  const clash = await db.productVariant.findFirst({ where: { sku: { in: skus }, ...(existing ? { productId: { not: existing.id } } : {}) }, select: { sku: true } });
  if (clash) throw new Error(`SKU ${clash.sku} is already used by another listing`);

  const required = category.attributes.filter((a) => a.required && !a.variantAxis);
  const missing = required.filter((a) => !input.attributes[a.key] || (Array.isArray(input.attributes[a.key]) && !input.attributes[a.key].length));
  const images = input.media.filter((m) => m.type === "IMAGE");
  const has3d = input.media.some((m) => m.type === "MODEL_3D");
  const quality = listingQuality({
    title: input.title,
    description: input.description,
    bullets: input.bullets,
    imageCount: images.length,
    has3d,
    attributesFilled: category.attributes.filter((a) => input.attributes[a.key]).length,
    attributesRequired: category.attributes.length,
    hasBrand: !!input.brand,
  });
  // Publishing requires the basics; otherwise the listing lands in "Needs attention".
  // A listing rejected by moderation stays rejected until an admin approves it again.
  const rejected = existing?.status === "REJECTED";
  const status = rejected ? "REJECTED" : !input.publish ? "DRAFT" : missing.length || !images.length ? "NEEDS_ATTENTION" : "ACTIVE";

  const variants = input.variants.map((v) => ({
    ...v,
    price: Math.round(v.price * 100),
    compareAtPrice: v.compareAtPrice ? Math.round(v.compareAtPrice * 100) : null,
    title: Object.values(v.options).join(" / ") || "Standard",
  }));
  const basePrice = Math.min(...variants.filter((v) => v.isActive).map((v) => v.price), ...(variants.some((v) => v.isActive) ? [] : variants.map((v) => v.price)));
  const compareAt = variants.find((v) => v.price === basePrice)?.compareAtPrice ?? null;
  const axisValues: Record<string, string[]> = {};
  for (const v of input.variants)
    for (const [k, val] of Object.entries(v.options)) {
      axisValues[k] ??= [];
      if (!axisValues[k].includes(val)) axisValues[k].push(val);
    }

  const warehouse =
    (await db.warehouse.findFirst({ where: { storeId, isDefault: true } })) ??
    (await db.warehouse.create({ data: { storeId, name: "Main warehouse", city: "Lahore", isDefault: true } }));

  const data = {
    categoryId: category.id,
    title: input.title,
    brand: input.brand || null,
    description: input.description,
    bullets: input.bullets.filter(Boolean),
    attributes: { ...input.attributes, ...axisValues },
    tags: input.tags,
    status,
    moderationNote: rejected ? existing.moderationNote : missing.length ? `Missing required attributes: ${missing.map((m) => m.label).join(", ")}` : !images.length && input.publish ? "Add at least one image" : null,
    basePrice,
    compareAtPrice: compareAt,
    shippingFee: Math.round(input.shippingFee * 100),
    deliveryMinDays: input.deliveryMinDays,
    deliveryMaxDays: Math.max(input.deliveryMinDays, input.deliveryMaxDays),
    returnWindowDays: input.returnWindowDays,
    bargainPct: input.bargainPct,
    qualityScore: quality.score,
    has3d,
    tryOnType: category.tryOnType,
  } as const;

  const product = await db.$transaction(async (tx) => {
    const p = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, storeId, slug: `${slugify(input.title)}-${randomToken(3)}` } });

    if (input.media.length || !existing) {
      await tx.productMedia.deleteMany({ where: { productId: p.id } });
      if (input.media.length) await tx.productMedia.createMany({ data: input.media.map((m, i) => ({ productId: p.id, type: m.type, url: m.url, alt: m.alt || input.title, position: m.type === "MODEL_3D" ? 99 : i })) });
    }

    const keep = new Set<string>();
    for (const v of variants) {
      const prior = existing?.variants.find((x) => x.id === v.id || x.sku === v.sku);
      const row = prior
        ? await tx.productVariant.update({ where: { id: prior.id }, data: { sku: v.sku, title: v.title, options: v.options, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, isActive: v.isActive } })
        : await tx.productVariant.create({ data: { productId: p.id, sku: v.sku, title: v.title, options: v.options, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, isActive: v.isActive } });
      keep.add(row.id);
      await tx.inventory.upsert({
        where: { variantId_warehouseId: { variantId: row.id, warehouseId: warehouse.id } },
        update: { quantity: v.stock },
        create: { variantId: row.id, warehouseId: warehouse.id, quantity: v.stock },
      });
    }
    if (existing) await tx.productVariant.updateMany({ where: { productId: p.id, id: { notIn: [...keep] } }, data: { isActive: false } });
    if (!existing || existing.basePrice !== basePrice) await tx.priceHistory.create({ data: { productId: p.id, price: basePrice } });
    return p;
  });

  if (product.status === "ACTIVE") await enqueue("search.index", { productIds: [product.id] }, { priority: PRIORITY.high });
  else if (existing?.status === "ACTIVE") await enqueue("search.remove", { productIds: [product.id] }, { priority: PRIORITY.high });
  if (existing && basePrice < existing.basePrice) await enqueue("price-alerts.check", { productId: product.id }, { priority: PRIORITY.high });
  return { product, quality, missing: missing.map((m) => m.label) };
}

// ───────────────────────────── API keys ─────────────────────────────

export function hashKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

/** Returns the full key once; only its hash is stored. Format: mq_live_<prefix>_<secret>. */
export async function createApiKey(storeId: string, name: string) {
  const prefix = randomBytes(5).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  await db.apiKey.create({ data: { storeId, name, prefix, hashedKey: hashKey(secret) } });
  return `mq_live_${prefix}_${secret}`;
}

export async function storeFromApiKey(header: string | null) {
  const m = header?.match(/^Bearer\s+mq_live_([a-f0-9]{10})_([A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const key = await db.apiKey.findUnique({ where: { prefix: m[1] }, include: { store: { include: { seller: true } } } });
  if (!key || key.revokedAt || key.hashedKey !== hashKey(m[2]) || key.store.seller.status !== "APPROVED") return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return key.store;
}
