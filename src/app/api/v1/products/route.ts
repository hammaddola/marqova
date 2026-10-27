import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productInputSchema, fieldErrors } from "@/lib/validation";
import { saveProduct, storeFromApiKey } from "@/server/products";

/**
 * Seller API — listings.
 *   GET  /api/v1/products?cursor=<id>&limit=50   cursor-paginated list
 *   POST /api/v1/products                        create or update (pass "id") a listing
 * Auth: Authorization: Bearer mq_live_<prefix>_<secret>
 */
export async function GET(req: Request) {
  const store = await storeFromApiKey(req.headers.get("authorization"));
  if (!store) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const cursor = url.searchParams.get("cursor");
  const rows = await db.product.findMany({
    where: { storeId: store.id },
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, slug: true, title: true, status: true, basePrice: true, updatedAt: true, variants: { select: { id: true, sku: true, title: true, price: true, stock: true, isActive: true } } },
  });
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  return NextResponse.json({ data, nextCursor: hasMore ? data[data.length - 1].id : null });
}

export async function POST(req: Request) {
  const store = await storeFromApiKey(req.headers.get("authorization"));
  if (!store) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const parsed = productInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", fields: fieldErrors(parsed.error) }, { status: 422 });
  try {
    const { product, quality, missing } = await saveProduct(store.id, parsed.data);
    return NextResponse.json({ id: product.id, slug: product.slug, status: product.status, qualityScore: quality.score, tips: quality.tips, missing }, { status: parsed.data.id ? 200 : 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
