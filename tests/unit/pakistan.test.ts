import { describe, expect, it } from "vitest";
import { normalizePkPhone } from "@/lib/pakistan";
import { addressSchema } from "@/lib/validation";

describe("normalizePkPhone", () => {
  it.each([
    ["0300 1234567", "+923001234567"],
    ["+92 321-7654321", "+923217654321"],
    ["00923451112233", "+923451112233"],
    ["042 35761234", "+924235761234"],
  ])("accepts %s", (input, out) => {
    expect(normalizePkPhone(input)).toBe(out);
  });
  it.each(["+1 415 555 0100", "12345", "0300 12345", "+44 7700 900123", "03001234567890"])("rejects %s", (input) => {
    expect(normalizePkPhone(input)).toBeNull();
  });
});

describe("addressSchema (Pakistan only)", () => {
  const base = { fullName: "Ayesha Khan", phone: "0300 1234567", line1: "House 5, Street 2", city: "Lahore", region: "Punjab", postalCode: "54000" };
  it("normalises the phone and fixes the country to PK", () => {
    const r = addressSchema.parse({ ...base, country: "PK" });
    expect(r.phone).toBe("+923001234567");
    expect(r.country).toBe("PK");
  });
  it("rejects other countries, unknown provinces and non-Pakistani postal codes", () => {
    expect(addressSchema.safeParse({ ...base, country: "US" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...base, region: "California" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...base, postalCode: "SW1A 1AA" }).success).toBe(false);
  });
});
