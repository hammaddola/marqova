import { describe, expect, it } from "vitest";
import { DEFAULT_SIZE_CHARTS, estimateBody, fitAdvice, fitForSize, recommendSize, regionFit } from "@/lib/fit";

describe("fit engine", () => {
  it("estimates larger measurements for heavier and broader bodies", () => {
    const slim = estimateBody({ body: "MEN", heightCm: 178, weightKg: 65, shape: "SLIM" });
    const broad = estimateBody({ body: "MEN", heightCm: 178, weightKg: 95, shape: "BROAD" });
    expect(broad.chest).toBeGreaterThan(slim.chest);
    expect(broad.waist).toBeGreaterThan(slim.waist);
  });

  it("classifies ease into tight / good / loose", () => {
    expect(regionFit("chest", 100, 101)).toBe("tight");
    expect(regionFit("chest", 106, 100)).toBe("good");
    expect(regionFit("chest", 120, 100)).toBe("loose");
  });

  it("recommends bigger sizes for bigger bodies", () => {
    const order = Object.keys(DEFAULT_SIZE_CHARTS.TOP);
    const small = recommendSize(DEFAULT_SIZE_CHARTS.TOP, estimateBody({ body: "MEN", heightCm: 165, weightKg: 55, shape: "SLIM" })).recommended;
    const large = recommendSize(DEFAULT_SIZE_CHARTS.TOP, estimateBody({ body: "MEN", heightCm: 188, weightKg: 100, shape: "BROAD" })).recommended;
    expect(order.indexOf(large)).toBeGreaterThan(order.indexOf(small));
  });

  it("recommends a shoe size from foot length", () => {
    const rec = recommendSize(DEFAULT_SIZE_CHARTS.SHOES, estimateBody({ body: "MEN", heightCm: 176, weightKg: 74, shape: "REGULAR" })).recommended;
    expect(["41", "42", "43"]).toContain(rec);
  });

  it("writes plain-language advice", () => {
    const body = estimateBody({ body: "WOMEN", heightCm: 163, weightKg: 60, shape: "REGULAR" });
    const tight = fitForSize(DEFAULT_SIZE_CHARTS.DRESS, "XS", body);
    expect(fitAdvice(tight)).toMatch(/tight/);
    const good = fitForSize(DEFAULT_SIZE_CHARTS.DRESS, recommendSize(DEFAULT_SIZE_CHARTS.DRESS, body).recommended, body);
    expect(fitAdvice(good)).toMatch(/Size/);
  });
});
