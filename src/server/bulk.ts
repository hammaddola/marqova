import "server-only";
import Papa from "papaparse";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify, randomToken } from "@/lib/utils";
import { listingQuality } from "@/lib/listing-quality";
import type { AttributeDefinition } from "@/generated/prisma/client";

/**
 * Bulk listing upload. One CSV row = one variant; rows sharing a `handle` become
 * one product with several variants. Valid products are imported even when other
 * rows fail (partial success) and every problem is reported with its row number.
 */
const BASE_COLUMNS = ["handle", "title", "brand", "description", "bullets", "sku", "price", "compare_at_price", "stock", "shipping_fee", "image_urls"] as const;

export function templateColumns(attrs: Pick<AttributeDefinition, "key" | "variantAxis">[]) {
  return [...BASE_COLUMNS, ...attrs.map((a) => (a.variantAxis ? `option_${a.key}` : `attr_${a.key}`))];
}

export async function buildTemplate(categoryId: string) {
  const category = await db.category.findUniqueOrThrow({ where: { id: categoryId }, include: { attributes: { orderBy: { position: "asc" } } } });
  const cols = templateColumns(category.attributes);
  const example: Record<string, string> = {
    handle: "sample-item-1",
    title: `Sample ${category.name} item — replace me`,
    brand: "Unbranded",
    description: "Describe materials, dimensions, care and what is in the box.",
    bullets: "First benefit|Second benefit|Third benefit",
    sku: "SKU-001",
    price: "1999",
    compare_at_price: "2499",
    stock: "25",
    shipping_fee: "150",
    image_urls: "https://example.com/image-1.jpg|https://example.com/image-2.jpg",
  };
  for (const a of category.attributes) example[a.variantAxis ? `option_${a.key}` : `attr_${a.key}`] = a.options[0] ?? "";
  return Papa.unparse({ fields: cols, data: [cols.map((c) => example[c] ?? "")] });
}

const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "must be a number like 1999 or 1999.50").transform((v) => Math.round(Number(v) * 100));

const rowSchema = z.object({
  handle: z.string().trim().min(1, "is required").max(80),
  title: z.string().trim().max(200).optional().default(""),
  brand: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(10_000).optional().default(""),
  bullets: z.string().optional().default(""),
  sku: z.string().trim().min(1, "is required").max(64),
  price: money,
  compare_at_price: z.union([money, z.literal("").transform(() => null)]).optional().default(null),
  stock: z.string().trim().regex(/^\d+$/, "must be a whole number").transform(Number),
  shipping_fee: z.union([money, z.literal("").transform(() => 0)]).optional().default(0),
  image_urls: z.string().optional().default(""),
});

export type RowError = { row: number; field: string; message: string };

export async function processBulkUpload(uploadId: string) {
  const upload = await db.bulkUpload.findUniqueOrThrow({ where: { id: uploadId } });
  const raw = await db.job.findFirst({ where: { type: "bulk.import", payload: { path: ["uploadId"], equals: uploadId } }, select: { payload: true } });
  const csv = (raw?.payload as { csv?: string } | null)?.csv ?? "";
  await db.bulkUpload.update({ where: { id: uploadId }, data: { status: "PROCESSING" } });

  const category = await db.category.findUniqueOrThrow({ where: { id: upload.categoryId }, include: { attributes: true } });
  const warehouse =
    (await db.warehouse.findFirst({ where: { storeId: upload.storeId, isDefault: true } })) ??
    (await db.warehouse.create({ data: { storeId: upload.storeId, name: "Main warehouse", city: "Lahore", isDefault: true } }));

  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  const errors: RowError[] = parsed.errors.map((e) => ({ row: (e.row ?? 0) + 2, field: "file", message: e.message }));
  const groups = new Map<string, { row: number; data: z.infer<typeof rowSchema>; raw: Record<string, string> }[]>();

  parsed.data.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const res = rowSchema.safeParse(r);
    if (!res.success) {
      for (const issue of res.error.issues) errors.push({ row: rowNo, field: String(issue.path[0] ?? "row"), message: issue.message });
      return;
    }
    for (const a of category.attributes) {
      const col = a.variantAxis ? `option_${a.key}` : `attr_${a.key}`;
      const v = r[col]?.trim();
      if (a.required && !v) errors.push({ row: rowNo, field: col, message: "is required for this category" });
      else if (v && a.options.length && (a.type === "SELECT" || a.type === "SIZE" || a.type === "COLOR") && !a.options.includes(v))
        errors.push({ row: rowNo, field: col, message: `must be one of: ${a.options.slice(0, 8).join(", ")}` });
    }
    if (errors.some((e) => e.row === rowNo)) return;
    const list = groups.get(res.data.handle) ?? [];
    list.push({ row: rowNo, data: res.data, raw: r });
    groups.set(res.data.handle, list);
  });

  const skus = [...groups.values()].flat().map((g) => g.data.sku);
  const taken = new Set((await db.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true } })).map((v) => v.sku));
  let success = 0;
  const createdIds: string[] = [];

  for (const [handle, rows] of groups) {
    const first = rows[0];
    const dupes = rows.filter((r) => taken.has(r.data.sku));
    if (dupes.length) {
      dupes.forEach((d) => errors.push({ row: d.row, field: "sku", message: "already exists in the catalog" }));
      continue;
    }
    if (!first.data.title) {
      errors.push({ row: first.row, field: "title", message: "is required on the first row of each handle" });
      continue;
    }
    try {
      const attributes: Record<string, string | string[]> = {};
      for (const a of category.attributes) {
        if (a.variantAxis) {
          const values = [...new Set(rows.map((r) => r.raw[`option_${a.key}`]?.trim()).filter(Boolean))] as string[];
          if (values.length) attributes[a.key] = values;
        } else {
          const v = first.raw[`attr_${a.key}`]?.trim();
          if (v) attributes[a.key] = v;
        }
      }
      const bullets = first.data.bullets.split("|").map((b) => b.trim()).filter(Boolean).slice(0, 10);
      const images = first.data.image_urls.split("|").map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u)).slice(0, 12);
      const quality = listingQuality({
        title: first.data.title,
        description: first.data.description,
        bullets,
        imageCount: images.length,
        has3d: false,
        attributesFilled: category.attributes.filter((a) => attributes[a.key]).length,
        attributesRequired: category.attributes.length,
        hasBrand: !!first.data.brand,
      });
      const product = await db.product.create({
        data: {
          storeId: upload.storeId,
          categoryId: category.id,
          title: first.data.title,
          slug: `${slugify(first.data.title)}-${randomToken(3)}`,
          brand: first.data.brand || null,
          description: first.data.description || first.data.title,
          bullets,
          attributes,
          tags: [handle],
          status: "DRAFT",
          basePrice: Math.min(...rows.map((r) => r.data.price)),
          compareAtPrice: first.data.compare_at_price,
          shippingFee: first.data.shipping_fee,
          tryOnType: category.tryOnType,
          qualityScore: quality.score,
          media: { create: images.map((url, i) => ({ url, alt: first.data.title, position: i })) },
          variants: {
            create: rows.map((r) => {
              const options = Object.fromEntries(
                category.attributes.filter((a) => a.variantAxis && r.raw[`option_${a.key}`]?.trim()).map((a) => [a.key, r.raw[`option_${a.key}`].trim()]),
              );
              return {
                sku: r.data.sku,
                title: Object.values(options).join(" / ") || "Default",
                options,
                price: r.data.price,
                compareAtPrice: r.data.compare_at_price,
                stock: r.data.stock,
                inventory: { create: { warehouseId: warehouse.id, quantity: r.data.stock } },
              };
            }),
          },
          priceHistory: { create: { price: Math.min(...rows.map((r) => r.data.price)) } },
        },
      });
      createdIds.push(product.id);
      success += rows.length;
    } catch (err) {
      errors.push({ row: first.row, field: "row", message: `could not be saved: ${(err as Error).message.slice(0, 120)}` });
    }
  }

  const total = parsed.data.length;
  await db.bulkUpload.update({
    where: { id: uploadId },
    data: {
      status: errors.length ? (success ? "PARTIAL" : "FAILED") : "COMPLETED",
      totalRows: total,
      successRows: success,
      errorRows: new Set(errors.map((e) => e.row)).size,
      report: errors.sort((a, b) => a.row - b.row).slice(0, 2000) as object,
    },
  });
  return { total, success, errors: errors.length, createdIds };
}
