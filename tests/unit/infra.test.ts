import { beforeEach, describe, expect, it } from "vitest";
import { PriorityQueue, topN } from "@/lib/priority-queue";
import { isRateLimited, rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { parseSearchParams, activeFilterCount } from "@/lib/search-params";
import { formatPrice, percentOff, slugify } from "@/lib/utils";
import { jsonLd } from "@/lib/seo";

describe("PriorityQueue", () => {
  it("pops lowest priority first and keeps FIFO order for ties", () => {
    const pq = new PriorityQueue<string>();
    pq.push("normal-1", 5);
    pq.push("critical", 0);
    pq.push("low", 9);
    pq.push("normal-2", 5);
    pq.push("high", 2);
    expect(pq.drain()).toEqual(["critical", "high", "normal-1", "normal-2", "low"]);
  });
  it("handles many items correctly", () => {
    const pq = new PriorityQueue<number>();
    const nums = Array.from({ length: 500 }, (_, i) => (i * 7919) % 1000);
    nums.forEach((n) => pq.push(n, n));
    expect(pq.drain()).toEqual([...nums].sort((a, b) => a - b));
  });
  it("selects top N by score", () => {
    expect(topN([5, 1, 9, 3, 7], 3, (x) => x)).toEqual([9, 7, 5]);
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());
  it("allows up to the limit then blocks until the window resets", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, t).ok).toBe(false);
    expect(rateLimit("k", 3, 1000, t + 1001).ok).toBe(true);
  });
  it("can check a budget without consuming it", () => {
    const t = 2_000_000;
    expect(isRateLimited("p", 2, t)).toBe(false);
    rateLimit("p", 2, 1000, t);
    rateLimit("p", 2, 1000, t);
    expect(isRateLimited("p", 2, t)).toBe(true);
    expect(isRateLimited("p", 2, t + 1001)).toBe(false);
  });
});

describe("parseSearchParams", () => {
  it("parses filters, converts rupees to minor units and ignores junk", () => {
    const p = parseSearchParams({ q: " linen ", min: "1000", max: "5000", brand: ["A", "B"], a_color: ["Navy"], "a_bad-key": "x", sort: "price_asc", page: "2", fast: "1" });
    expect(p.q).toBe("linen");
    expect(p.minPrice).toBe(100_000);
    expect(p.maxPrice).toBe(500_000);
    expect(p.brands).toEqual(["A", "B"]);
    expect(p.attrs).toEqual({ color: ["Navy"] });
    expect(p.sort).toBe("price_asc");
    expect(p.page).toBe(2);
    expect(activeFilterCount(p)).toBe(6);
  });
  it("rejects unknown sorts and bad pages", () => {
    const p = parseSearchParams({ sort: "drop table", page: "-5" });
    expect(p.sort).toBeUndefined();
    expect(p.page).toBe(1);
  });
});

describe("utils", () => {
  it("formats rupees from paisa", () => {
    expect(formatPrice(129_900)).toBe("Rs 1,299");
  });
  it("computes percent off", () => {
    expect(percentOff(750, 1000)).toBe(25);
    expect(percentOff(1000, null)).toBe(0);
  });
  it("slugifies", () => {
    expect(slugify("Men's Clothing & Shoes!")).toBe("men-s-clothing-shoes");
  });
  it("escapes JSON-LD so it can't break out of the script tag", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" }).__html).not.toContain("</script>");
  });
});
