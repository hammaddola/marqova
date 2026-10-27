/** Review integrity heuristics: bursts and duplicate text. Flags go to admin moderation. */
export type ReviewSample = { body: string; createdAt: Date; userId: string };

export function normalizeText(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function shingles(s: string, size = 3) {
  const words = normalizeText(s).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) out.add(words.slice(i, i + size).join(" "));
  if (!out.size && words.length) out.add(words.join(" "));
  return out;
}

/** Jaccard similarity of word 3-gram shingles, 0..1. */
export function textSimilarity(a: string, b: string) {
  const A = shingles(a);
  const B = shingles(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

export const REVIEW_GUARD_DEFAULTS = { burstWindowHours: 24, burstThreshold: 8, similarity: 0.6 };

/** `recent` = other reviews on the same product (most recent first). */
export function detectReviewFlags(candidate: ReviewSample, recent: ReviewSample[], opts = REVIEW_GUARD_DEFAULTS) {
  const flags: string[] = [];
  const windowStart = candidate.createdAt.getTime() - opts.burstWindowHours * 3_600_000;
  const inWindow = recent.filter((r) => r.createdAt.getTime() >= windowStart);
  if (inWindow.length + 1 >= opts.burstThreshold) flags.push("REVIEW_BURST");
  if (recent.some((r) => r.userId !== candidate.userId && textSimilarity(r.body, candidate.body) >= opts.similarity)) flags.push("DUPLICATE_TEXT");
  if (normalizeText(candidate.body).split(" ").filter(Boolean).length < 4) flags.push("LOW_EFFORT");
  return flags;
}
