import { NextResponse } from "next/server";
import { z } from "zod";
import { getAI } from "@/lib/providers/ai";
import { formatPrice } from "@/lib/utils";
import { db } from "@/lib/db";
import { getSessionUser } from "@/server/session";
import { getCategoryTree, flattenTree } from "@/server/catalog";
import { searchProducts } from "@/server/search";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(30),
});

/**
 * Shopping assistant. Parses the latest message into search filters, runs a real
 * catalog search, and lets the AI provider phrase the answer. With the mock
 * provider it still returns real products.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { messages } = parsed.data;
  const last = messages[messages.length - 1].content;
  const ai = getAI();
  const categories = flattenTree(await getCategoryTree()).map((c) => ({ slug: c.slug, name: c.name }));

  let context = "";
  let products: { title: string; slug: string; price: string; rating: number }[] = [];
  let orders: { number: string; status: string; id: string }[] = [];

  if (/track|order|where is|delivery status/i.test(last)) {
    const user = await getSessionUser();
    if (user) {
      orders = (await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, number: true, status: true } })).map((o) => ({ ...o, status: o.status.replace("_", " ").toLowerCase() }));
      context = orders.length ? `Your latest orders: ${orders.map((o) => `${o.number} (${o.status})`).join(", ")}.` : "You don't have any orders yet.";
    } else context = "Sign in to see your orders.";
  } else {
    const q = await ai.parseQuery(last, categories);
    const result = await searchProducts({
      q: q.text || undefined,
      category: q.category,
      maxPrice: q.maxPrice,
      minPrice: q.minPrice,
      minRating: q.minRating,
      attrs: q.color ? { color: [q.color.charAt(0).toUpperCase() + q.color.slice(1)] } : undefined,
      perPage: 4,
    });
    products = result.items.map((p) => ({ title: p.title, slug: p.slug, price: formatPrice(p.price), rating: p.rating }));
    context = products.length
      ? `I found ${result.total} match${result.total === 1 ? "" : "es"}. Top picks: ${products.map((p) => `${p.title} (${p.price}, ${p.rating.toFixed(1)}★)`).join("; ")}.`
      : "I couldn't find an exact match — try fewer words or a different price range.";
  }

  let reply: string;
  try {
    reply = await ai.chat(messages, context);
  } catch {
    reply = context;
  }
  return NextResponse.json({ reply, products, orders, provider: ai.id });
}
