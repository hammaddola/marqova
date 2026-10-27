import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { storeFromApiKey } from "@/server/products";

const schema = z.object({
  updates: z
    .array(z.object({ sku: z.string().min(1).max(64), quantity: z.number().int().min(0).max(1_000_000), warehouse: z.string().max(80).optional() }))
    .min(1)
    .max(500),
});

/**
 * Seller API — inventory sync.
 *   PATCH /api/v1/inventory  { updates: [{ sku, quantity, warehouse? }] }
 * Sets absolute on-hand quantity per SKU (per warehouse when given). Partial success is reported per SKU.
 */
export async function PATCH(req: Request) {
  const store = await storeFromApiKey(req.headers.get("authorization"));
  if (!store) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });

  const warehouses = await db.warehouse.findMany({ where: { storeId: store.id } });
  const fallback = warehouses.find((w) => w.isDefault) ?? warehouses[0];
  const results: { sku: string; ok: boolean; stock?: number; error?: string }[] = [];

  for (const u of parsed.data.updates) {
    const variant = await db.productVariant.findFirst({ where: { sku: u.sku, product: { storeId: store.id } } });
    const wh = u.warehouse ? warehouses.find((w) => w.name.toLowerCase() === u.warehouse!.toLowerCase()) : fallback;
    if (!variant) {
      results.push({ sku: u.sku, ok: false, error: "Unknown SKU" });
      continue;
    }
    if (!wh) {
      results.push({ sku: u.sku, ok: false, error: "Unknown warehouse" });
      continue;
    }
    await db.inventory.upsert({ where: { variantId_warehouseId: { variantId: variant.id, warehouseId: wh.id } }, update: { quantity: u.quantity }, create: { variantId: variant.id, warehouseId: wh.id, quantity: u.quantity } });
    const sum = await db.inventory.aggregate({ where: { variantId: variant.id }, _sum: { quantity: true, reserved: true } });
    const stock = Math.max(0, (sum._sum.quantity ?? 0) - (sum._sum.reserved ?? 0));
    await db.productVariant.update({ where: { id: variant.id }, data: { stock } });
    results.push({ sku: u.sku, ok: true, stock });
  }
  return NextResponse.json({ results }, { status: results.every((r) => r.ok) ? 200 : 207 });
}
