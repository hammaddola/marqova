import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/pricing";
import { FREE_DELIVERY_THRESHOLD, addBusinessDays, cityAdjustment } from "@/lib/delivery";
import { calculateFees } from "@/lib/fees";

const line = (unitPrice: number, quantity = 1, storeId = "s1", shippingFee = 200_00) => ({ unitPrice, quantity, storeId, shippingFee });

describe("computeTotals", () => {
  it("charges shipping once per store parcel using the highest fee", () => {
    const t = computeTotals([line(500_00, 1, "a", 150_00), line(300_00, 1, "a", 250_00), line(400_00, 1, "b", 100_00)]);
    expect(t.subtotal).toBe(1200_00);
    expect(t.shipping).toBe(350_00);
    expect(t.total).toBe(1550_00);
  });

  it("gives free standard delivery above the threshold", () => {
    const t = computeTotals([line(FREE_DELIVERY_THRESHOLD)]);
    expect(t.shipping).toBe(0);
  });

  it("adds the express surcharge", () => {
    const t = computeTotals([line(1000_00)], { deliveryId: "express" });
    expect(t.delivery.id).toBe("express");
    expect(t.shipping).toBe(200_00 + 350_00);
  });

  it("applies percent, fixed and free-shipping coupons", () => {
    expect(computeTotals([line(1000_00)], { coupon: { code: "P10", type: "PERCENT", value: 10, minSubtotal: 0 } }).discount).toBe(100_00);
    expect(computeTotals([line(1000_00)], { coupon: { code: "F", type: "FIXED", value: 5000_00, minSubtotal: 0 } }).discount).toBe(1000_00);
    const fs = computeTotals([line(1000_00)], { coupon: { code: "FS", type: "FREE_SHIPPING", value: 0, minSubtotal: 0 } });
    expect(fs.shipping).toBe(0);
    expect(fs.couponApplied).toBe("FS");
  });

  it("enforces minimum spend and store-scoped coupons", () => {
    const min = computeTotals([line(1000_00)], { coupon: { code: "BIG", type: "FIXED", value: 100_00, minSubtotal: 5000_00 } });
    expect(min.discount).toBe(0);
    expect(min.couponError).toMatch(/minimum/);
    const scoped = computeTotals([line(1000_00, 1, "a"), line(1000_00, 1, "b")], { coupon: { code: "A15", type: "PERCENT", value: 15, minSubtotal: 0, storeId: "a" } });
    expect(scoped.discount).toBe(150_00);
  });

  it("never returns a negative total and handles an empty cart", () => {
    expect(computeTotals([]).total).toBe(0);
    expect(computeTotals([]).shipping).toBe(0);
  });
});

describe("delivery", () => {
  it("skips Sundays when adding business days", () => {
    const saturday = new Date("2026-10-31T10:00:00");
    expect(addBusinessDays(saturday, 1).getDay()).toBe(1); // Monday
  });
  it("adds days for remote cities", () => {
    expect(cityAdjustment("Skardu")).toBe(2);
    expect(cityAdjustment("Lahore")).toBe(0);
  });
});

describe("calculateFees", () => {
  it("breaks down commission, fixed and payment fees", () => {
    const f = calculateFees({ salePrice: 10_000_00, quantity: 2, commissionBps: 1000 });
    expect(f.gross).toBe(20_000_00);
    expect(f.commission).toBe(2_000_00);
    expect(f.fixed).toBe(50_00);
    expect(f.payment).toBe(400_00);
    expect(f.net).toBe(20_000_00 - 2_450_00);
  });
});
