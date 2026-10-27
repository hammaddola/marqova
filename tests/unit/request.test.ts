import { describe, expect, it } from "vitest";
import { clientIpFrom, safeNextPath } from "@/lib/request";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/account/orders?x=1#top")).toBe("/account/orders?x=1#top");
  });
  it.each(["//evil.com", "/\\evil.com", "\\\\evil.com", "https://evil.com", "/\tevil", "javascript:alert(1)", 42, undefined])("rejects %s", (bad) => {
    expect(safeNextPath(bad)).toBe("/");
  });
});

describe("clientIpFrom", () => {
  it("prefers x-real-ip, then the right-most forwarded hop (set by our proxy)", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIpFrom(new Headers())).toBe("local");
  });
});
