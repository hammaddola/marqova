import { NextResponse } from "next/server";
import { z } from "zod";
import { getAI, mockAI, type ParsedQuery } from "@/lib/providers/ai";
import { formatPrice } from "@/lib/utils";
import { matchFaq, FAQ } from "@/lib/faq";
import { MULTI_SELLER } from "@/lib/marketplace";
import { db } from "@/lib/db";
import { getSessionUser } from "@/server/session";
import { getCategoryTree, flattenTree } from "@/server/catalog";
import { searchProducts } from "@/server/search";

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(30),
});

// Conversation filler that never appears in product titles.
const FILLER = new Set("i im i'm me my want need looking look searching search show find get buy give please pls any some something do you have got is are there can could would like to a an the for with in of on and or me".split(" "));
const GREETING = /^(hi|hello|hey|salam|assalam|aoa|salaam|good (morning|evening|afternoon)|thanks|thank you|shukriya|ok|okay)\b/i;
const QUESTION = /^(how|what|when|where|why|which|who|can i|do i|do you|is it|is there|will i)\b/i;

const singular = (w: string) => (/(ss|sh|ch|x)es$/.test(w) ? w.slice(0, -2) : /[^s]s$/.test(w) && w.length > 3 ? w.slice(0, -1) : w);

/** Words worth searching for: no filler, no colour (that's a filter), singular. */
function keywords(text: string, color?: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER.has(w) && w !== color)
    .map(singular)
    .slice(0, 5);
}

/**
 * Searches strictly first, then relaxes one constraint at a time so shoppers get
 * close matches instead of nothing — and the reply says what was relaxed.
 */
async function findProducts(q: ParsedQuery) {
  const words = keywords(q.text, q.color);
  const color = q.color ? [q.color.charAt(0).toUpperCase() + q.color.slice(1)] : undefined;
  const base = { category: q.category, minPrice: q.minPrice, maxPrice: q.maxPrice, perPage: 4 };
  const attempts: { params: Parameters<typeof searchProducts>[0]; relaxed?: string }[] = [
    { params: { ...base, q: words.join(" ") || undefined, minRating: q.minRating, attrs: color && { color } } },
    ...(color || q.minRating ? [{ params: { ...base, q: words.join(" ") || undefined }, relaxed: [color && `in ${q.color}`, q.minRating && `rated ${q.minRating}+`].filter(Boolean).join(" or ") }] : []),
    // The most specific single word (usually the product noun) with the price kept.
    ...[...words].reverse().map((w) => ({ params: { ...base, q: w }, relaxed: "for every word you typed" })),
    ...(q.maxPrice || q.minPrice ? [{ params: { q: words.at(-1), category: q.category, perPage: 4 }, relaxed: "in that price range" }] : []),
  ];
  for (const a of attempts) {
    if (!a.params.q && !a.params.category && !a.params.maxPrice && !a.params.minPrice) continue;
    const r = await searchProducts(a.params);
    if (r.items.length) return { ...r, relaxed: a.relaxed, query: a.params };
  }
  return null;
}

function searchUrl(p: Parameters<typeof searchProducts>[0]) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.minPrice) sp.set("min", String(p.minPrice / 100));
  if (p.maxPrice) sp.set("max", String(p.maxPrice / 100));
  return `/search?${sp}`;
}

/**
 * Shopping assistant. Routes each message to order tracking, the help centre, or a
 * real catalog search, then lets the AI provider phrase the answer. With the mock
 * provider (or if the AI is unreachable) it still answers from real data.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { messages } = parsed.data;
  const last = messages[messages.length - 1].content.trim();
  const ai = getAI();

  let context = "";
  let products: { title: string; slug: string; price: string; rating: number }[] = [];
  let orders: { number: string; status: string; id: string }[] = [];
  let link: { href: string; label: string } | null = null;
  const faq = matchFaq(last, FAQ.filter((t) => MULTI_SELLER || t.id !== "selling"));

  if (/\b(track|where is my|order status|my orders?)\b/i.test(last)) {
    const user = await getSessionUser();
    if (user) {
      orders = (await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, number: true, status: true } })).map((o) => ({ ...o, status: o.status.replaceAll("_", " ").toLowerCase() }));
      context = orders.length ? `Your latest orders: ${orders.map((o) => `${o.number} (${o.status})`).join(", ")}. Tap one to see every tracking update.` : "You don't have any orders yet.";
      link = { href: "/account/orders", label: "All your orders" };
    } else {
      context = "Sign in to see your orders and their tracking. Guest orders can be followed from the link in your confirmation email.";
      link = { href: "/login?next=/account/orders", label: "Sign in" };
    }
  } else if (GREETING.test(last) && last.split(/\s+/).length <= 4) {
    context = "Wa alaikum assalam! Tell me what you're shopping for, like “black sneakers under 8000”, or ask about delivery, payment or returns.";
  } else if (faq && QUESTION.test(last)) {
    context = faq.a;
    link = faq.link ?? { href: "/help", label: "More in the Help centre" };
  } else {
    const categories = flattenTree(await getCategoryTree()).map((c) => ({ slug: c.slug, name: c.name }));
    // The live AI parser is optional: fall back to the built-in one if it's unreachable.
    const q = await ai.parseQuery(last, categories).catch(() => mockAI.parseQuery(last, categories));
    const result = await findProducts(q);
    if (result) {
      products = result.items.map((p) => ({ title: p.title, slug: p.slug, price: formatPrice(p.price), rating: p.rating }));
      const intro = result.relaxed ? `No exact match ${result.relaxed}, so here are the closest picks` : `I found ${result.total} match${result.total === 1 ? "" : "es"}. Top picks`;
      context = `${intro}: ${result.items.map((p) => `${p.title} (${formatPrice(p.price)}${p.rating ? `, ${p.rating.toFixed(1)}★` : ""})`).join("; ")}.`;
      link = { href: searchUrl(result.query), label: result.total > products.length ? `See all ${result.total} results` : "Open in search" };
    } else if (faq) {
      context = faq.a;
      link = faq.link ?? { href: "/help", label: "More in the Help centre" };
    } else {
      context = "I couldn't find that in the catalog yet. Try a simpler description, like “sneakers” or “cotton kurta”, or browse the categories.";
      link = { href: "/search", label: "Browse all products" };
    }
  }

  let reply: string;
  try {
    reply = await ai.chat(messages, context);
  } catch {
    reply = context;
  }
  return NextResponse.json({ reply, products, orders, link, provider: ai.id });
}
