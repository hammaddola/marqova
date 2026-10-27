import "server-only";

export type ListingDraft = {
  title: string;
  bullets: string[];
  description: string;
  categorySlug: string;
  attributes: Record<string, string>;
  tags: string[];
};

export type ReviewSummary = { summary: string; topics: { label: string; sentiment: "positive" | "negative" | "mixed"; count: number }[] };

export type ParsedQuery = { text: string; maxPrice?: number; minPrice?: number; minRating?: number; color?: string; category?: string };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AIProvider {
  id: string;
  draftListing(input: { fileNames: string[]; hint?: string; categories: { slug: string; name: string }[] }): Promise<ListingDraft>;
  summarizeReviews(reviews: { rating: number; body: string }[]): Promise<ReviewSummary>;
  parseQuery(q: string, categories: { slug: string; name: string }[]): Promise<ParsedQuery>;
  chat(messages: ChatMessage[], context: string): Promise<string>;
}

// ───────────── Mock provider: deterministic heuristics, no network ─────────────

const COLORS = ["black", "white", "navy", "blue", "red", "green", "grey", "gray", "beige", "brown", "pink", "gold", "silver", "olive", "maroon"];

const TOPIC_WORDS: Record<string, string[]> = {
  Quality: ["quality", "sturdy", "durable", "build", "well made", "stitching", "cheap"],
  Fit: ["fit", "size", "tight", "loose", "true to size", "small", "large"],
  Value: ["price", "value", "worth", "expensive", "cheap", "money"],
  Delivery: ["delivery", "arrived", "shipping", "packaging", "late", "fast"],
  Comfort: ["comfortable", "comfort", "soft", "itchy"],
  Battery: ["battery", "charge", "charging"],
  Design: ["look", "design", "color", "colour", "style", "beautiful"],
};

export const mockAI: AIProvider = {
  id: "mock",
  async draftListing({ fileNames, hint, categories }) {
    const words = `${hint ?? ""} ${fileNames.join(" ")}`
      .replace(/\.[a-z0-9]+/gi, " ")
      .replace(/[_\-\d]+/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const color = words.find((w) => COLORS.includes(w));
    const category =
      categories.find((c) => words.some((w) => c.slug.includes(w) || c.name.toLowerCase().includes(w))) ?? categories[0];
    const noun = words.filter((w) => !COLORS.includes(w)).slice(0, 3).map(cap).join(" ") || "Product";
    const title = `${color ? cap(color) + " " : ""}${noun} — Everyday Essential`;
    return {
      title,
      categorySlug: category?.slug ?? "",
      bullets: [
        `Thoughtfully designed ${noun.toLowerCase()} for daily use`,
        "Quality-checked materials chosen for durability",
        "Easy care and simple maintenance",
        "Backed by Marqova buyer protection",
        "Ships in recyclable packaging",
      ],
      description: `This ${noun.toLowerCase()} is drafted by the Marqova assistant from your photos. Review every detail — materials, dimensions and care instructions — before publishing. Accurate listings get higher Listing Quality Scores and fewer returns.`,
      attributes: color ? { color: cap(color) } : ({} as Record<string, string>),
      tags: [...new Set(words)].slice(0, 8),
    };
  },
  async summarizeReviews(reviews) {
    if (!reviews.length) return { summary: "No verified reviews yet.", topics: [] };
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const topics = Object.entries(TOPIC_WORDS)
      .map(([label, kws]) => {
        const hits = reviews.filter((r) => kws.some((k) => r.body.toLowerCase().includes(k)));
        if (!hits.length) return null;
        const a = hits.reduce((s, r) => s + r.rating, 0) / hits.length;
        const sentiment: "positive" | "negative" | "mixed" = a >= 4 ? "positive" : a <= 2.5 ? "negative" : "mixed";
        return { label, sentiment, count: hits.length };
      })
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const tone = avg >= 4.3 ? "Buyers are very happy" : avg >= 3.5 ? "Most buyers are satisfied" : "Buyers have mixed feelings";
    const pos = topics.filter((t) => t.sentiment === "positive").map((t) => t.label.toLowerCase());
    const neg = topics.filter((t) => t.sentiment !== "positive").map((t) => t.label.toLowerCase());
    let summary = `${tone} with this product`;
    if (pos.length) summary += `, especially its ${pos.slice(0, 3).join(", ")}`;
    summary += ".";
    if (neg.length) summary += ` Some mention concerns about ${neg.slice(0, 2).join(" and ")}.`;
    return { summary, topics };
  },
  async parseQuery(q, categories) {
    const lower = q.toLowerCase();
    const out: ParsedQuery = { text: q };
    const under = lower.match(/(?:under|below|less than|<)\s*(?:rs\.?\s*)?([\d,]+)\s*(k)?/);
    if (under) out.maxPrice = Number(under[1].replace(/,/g, "")) * (under[2] ? 1000 : 1) * 100;
    const over = lower.match(/(?:over|above|more than|>)\s*(?:rs\.?\s*)?([\d,]+)\s*(k)?/);
    if (over) out.minPrice = Number(over[1].replace(/,/g, "")) * (over[2] ? 1000 : 1) * 100;
    const rating = lower.match(/(\d(?:\.\d)?)\s*\+?\s*stars?/);
    if (rating) out.minRating = Number(rating[1]);
    out.color = COLORS.find((c) => new RegExp(`\\b${c}\\b`).test(lower));
    out.category = categories.find((c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.slug))?.slug;
    out.text = lower
      .replace(/(under|below|less than|over|above|more than)\s*(rs\.?\s*)?[\d,]+\s*k?/g, "")
      .replace(/\d(\.\d)?\s*\+?\s*stars?/g, "")
      .replace(/\b(show me|find|i want|looking for|cheap|best|good|some|a|an|the|for|with)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return out;
  },
  async chat(messages, context) {
    const last = messages[messages.length - 1]?.content ?? "";
    if (/track|order|where is/i.test(last)) return "You can follow every parcel in **Returns & Orders**. Each order shows the courier, tracking number and the latest scan. " + context;
    if (/size|fit/i.test(last)) return "For clothing and shoes, open the product and tap **Try it on me** — the Try-On Studio recommends a size from your height, weight and body shape. " + context;
    if (/compare|vs|versus|difference/i.test(last)) return "Add products to compare from their page (the ⇄ Compare button), or ask me about two products by name. " + context;
    return context || "I can search the catalog in plain language, help with sizing, compare products and track orders. What are you shopping for?";
  },
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ───────────── Anthropic provider (enabled with AI_PROVIDER=anthropic) ─────────────

async function claude(system: string, messages: ChatMessage[], maxTokens = 800) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: process.env.AI_MODEL ?? "claude-sonnet-5-5", max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.map((c) => c.text ?? "").join("");
}

function parseJson<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return match ? (JSON.parse(match[0]) as T) : fallback;
  } catch {
    return fallback;
  }
}

const anthropicAI: AIProvider = {
  id: "anthropic",
  async draftListing(input) {
    const fallback = await mockAI.draftListing(input);
    const text = await claude(
      "You write accurate, honest e-commerce listings. Reply with JSON only: {title, bullets (5), description, categorySlug, attributes (object of strings), tags (array)}. Never invent certifications or brand names.",
      [{ role: "user", content: `Photos: ${input.fileNames.join(", ")}\nSeller hint: ${input.hint ?? "none"}\nCategories: ${input.categories.map((c) => c.slug).join(", ")}` }],
    );
    return { ...fallback, ...parseJson<Partial<ListingDraft>>(text, {}) };
  },
  async summarizeReviews(reviews) {
    const fallback = await mockAI.summarizeReviews(reviews);
    if (!reviews.length) return fallback;
    const text = await claude(
      'Summarise verified product reviews in 2 sentences and extract up to 6 topics. Reply JSON only: {"summary": string, "topics": [{"label": string, "sentiment": "positive"|"negative"|"mixed", "count": number}]}',
      [{ role: "user", content: reviews.slice(0, 80).map((r) => `(${r.rating}★) ${r.body}`).join("\n") }],
    );
    return parseJson(text, fallback);
  },
  async parseQuery(q, categories) {
    const fallback = await mockAI.parseQuery(q, categories);
    const text = await claude(
      `Turn a shopping request into search filters. Prices are in Pakistani rupees; return them in paisa (x100). Category must be one of: ${categories.map((c) => c.slug).join(", ")}. Reply JSON only: {text, maxPrice?, minPrice?, minRating?, color?, category?}`,
      [{ role: "user", content: q }],
      300,
    );
    return { ...fallback, ...parseJson<Partial<ParsedQuery>>(text, {}) };
  },
  async chat(messages, context) {
    return claude(
      `You are the Marqova shopping assistant. Be concise, honest and helpful. Only recommend products from the provided catalog context. Context:\n${context}`,
      messages.slice(-12),
    );
  },
};

export function getAI(): AIProvider {
  if (process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY) return anthropicAI;
  return mockAI;
}
