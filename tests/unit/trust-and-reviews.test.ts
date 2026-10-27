import { describe, expect, it } from "vitest";
import { computeTrustScore, trustComponents, trustLabel } from "@/lib/trust-score";
import { detectReviewFlags, textSimilarity } from "@/lib/review-guard";
import { counterfeitFlags, median } from "@/lib/moderation";
import { listingQuality } from "@/lib/listing-quality";

describe("Trust Score", () => {
  it("scores a perfect seller 100", () => {
    expect(computeTrustScore({ onTimeRate: 1, returnRate: 0, cancelRate: 0, reviewRating: 5, responseHours: 1 })).toBe(100);
  });
  it("scores a poor seller near zero", () => {
    expect(computeTrustScore({ onTimeRate: 0, returnRate: 0.5, cancelRate: 0.5, reviewRating: 1, responseHours: 100 })).toBe(0);
  });
  it("clamps bad inputs and keeps components within their weights", () => {
    const c = trustComponents({ onTimeRate: 2, returnRate: -1, cancelRate: Number.NaN, reviewRating: 9, responseHours: -5 });
    expect(c.onTime).toBe(30);
    expect(c.returns).toBe(15);
    expect(c.reviews).toBe(25);
  });
  it("labels scores", () => {
    expect(trustLabel(90)).toBe("Excellent");
    expect(trustLabel(72)).toBe("Good");
    expect(trustLabel(10)).toBe("Needs improvement");
  });
});

describe("review guard", () => {
  const now = new Date();
  it("detects copied text from another user", () => {
    const body = "Amazing product, the quality is excellent and delivery was super fast";
    expect(textSimilarity(body, body)).toBe(1);
    const flags = detectReviewFlags({ body, createdAt: now, userId: "u1" }, [{ body: `${body}!`, createdAt: now, userId: "u2" }]);
    expect(flags).toContain("DUPLICATE_TEXT");
  });
  it("detects bursts of reviews", () => {
    const recent = Array.from({ length: 8 }, (_, i) => ({ body: `unique review number ${i} with words`, createdAt: now, userId: `u${i}` }));
    expect(detectReviewFlags({ body: "a genuinely different honest review text", createdAt: now, userId: "x" }, recent)).toContain("REVIEW_BURST");
  });
  it("passes a normal, original review", () => {
    expect(detectReviewFlags({ body: "Fits well and the fabric feels soft after washing", createdAt: now, userId: "x" }, [])).toEqual([]);
  });
});

describe("counterfeit flags", () => {
  it("flags replica wording, brand mismatch and implausible price", () => {
    const flags = counterfeitFlags({ title: "Nike Air master copy sneakers", description: "", brand: "Generic", price: 1000 }, 10_000);
    expect(flags.map((f) => f.code).sort()).toEqual(["BRAND_MISMATCH", "PRICE_TOO_LOW", "REPLICA_TERMS"]);
  });
  it("does not flag a genuine brand listing", () => {
    expect(counterfeitFlags({ title: "Nike Pegasus running shoe", description: "", brand: "Nike", price: 9000 }, 10_000)).toEqual([]);
  });
  it("computes medians", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });
});

describe("listing quality", () => {
  it("rewards complete listings and gives tips for incomplete ones", () => {
    const full = listingQuality({ title: "Sample linen camp-collar shirt in navy blue", description: "x".repeat(250), bullets: ["a", "b", "c", "d", "e"], imageCount: 6, has3d: true, attributesFilled: 4, attributesRequired: 4, hasBrand: true });
    expect(full.score).toBe(100);
    expect(full.tips).toEqual([]);
    const thin = listingQuality({ title: "Shirt", description: "", bullets: [], imageCount: 1, has3d: false, attributesFilled: 0, attributesRequired: 4, hasBrand: false });
    expect(thin.score).toBeLessThan(20);
    expect(thin.tips.length).toBeGreaterThan(4);
  });
});
