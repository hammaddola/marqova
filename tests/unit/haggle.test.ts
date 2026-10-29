import { describe, expect, it } from "vitest";
import { MAX_ROUNDS, haggleFloor, respond, startHaggle, walkAway, type HaggleState } from "@/lib/haggle";
import { computeTotals } from "@/lib/pricing";

describe("Bhao-Taao", () => {
  it("rounds the floor up to Rs 10 and caps the discount at 50%", () => {
    expect(haggleFloor(1999_00, 10)).toBe(1800_00);
    expect(haggleFloor(1000_00, 90)).toBe(500_00);
    expect(haggleFloor(1000_00, 0)).toBe(1000_00);
  });

  it("accepts an offer at or above the ask, at the ask", () => {
    const r = respond(startHaggle(1000_00, 20), 1200_00);
    expect(r).toMatchObject({ kind: "deal", deal: 1000_00 });
  });

  it("splits the difference and ignores lowballs", () => {
    const s = startHaggle(1000_00, 20);
    expect(respond(s, 900_00)).toMatchObject({ kind: "counter", state: { ask: 950_00, rounds: 1 } });
    expect(respond(s, 100_00)).toMatchObject({ kind: "insulted", state: { ask: 1000_00, rounds: 1 } });
  });

  it("never goes below the floor, however stubborn the shopper is", () => {
    let s: HaggleState = startHaggle(1000_00, 20);
    for (let i = 0; i < MAX_ROUNDS; i++) {
      const r = respond(s, 500_00);
      if (r.kind === "deal") expect(r.deal).toBeGreaterThanOrEqual(800_00);
      s = r.state;
      expect(s.ask).toBeGreaterThanOrEqual(800_00);
    }
    expect(s.ask).toBeGreaterThan(800_00);
    expect(respond(s, 1).kind).toBe("final");
  });

  it("calls the shopper back once with a smaller cut", () => {
    const s = { ...startHaggle(1000_00, 20), ask: 950_00 };
    const back = walkAway(s);
    expect(back).toMatchObject({ kind: "callback", state: { ask: 900_00, calledBack: true } });
    expect(walkAway(back!.state)).toBeNull();
  });

  it("closes the deal when the gap is tiny", () => {
    const s = { ...startHaggle(1000_00, 20), ask: 830_00 };
    expect(respond(s, 815_00)).toMatchObject({ kind: "deal", deal: 815_00 });
  });

  it("applies a product deal coupon to that product only", () => {
    const lines = [
      { unitPrice: 1000_00, quantity: 1, storeId: "s", shippingFee: 0, productId: "a" },
      { unitPrice: 5000_00, quantity: 1, storeId: "s", shippingFee: 0, productId: "b" },
    ];
    const coupon = { code: "BHAO", type: "FIXED" as const, value: 2000_00, minSubtotal: 0, productId: "a" };
    expect(computeTotals(lines, { coupon }).discount).toBe(1000_00);
    expect(computeTotals(lines.slice(1), { coupon }).couponError).toBeTruthy();
  });
});
