import { describe, expect, it } from "vitest";
import { cartKind } from "@/lib/marketplace";

const line = (isSample: boolean) => ({ product: { isSample } });

describe("cartKind", () => {
  it("treats a cart of real items as live", () => {
    expect(cartKind([line(false), line(false)])).toBe("live");
  });
  it("treats a cart of only preview items as a preview order", () => {
    expect(cartKind([line(true), line(true)])).toBe("preview");
  });
  it("flags carts that mix preview and real items so checkout can refuse them", () => {
    expect(cartKind([line(true), line(false)])).toBe("mixed");
  });
});
