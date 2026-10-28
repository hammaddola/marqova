/**
 * Marketplace mode. "single" (default): one seller, the owner; seller sign-up is closed and
 * every "Sell on Marqova" entry point is hidden. "multi": open to verified third-party sellers.
 * NEXT_PUBLIC_ so client components read the same value; it is inlined at build time.
 */
export const MULTI_SELLER = process.env.NEXT_PUBLIC_MARKETPLACE_MODE === "multi";

/**
 * Classifies a cart by its preview (seeded, not-for-sale) items. Checkout refuses "mixed"
 * carts, and "preview" orders never reach a payment provider.
 */
export function cartKind(lines: { product: { isSample: boolean } }[]): "live" | "preview" | "mixed" {
  const preview = lines.filter((l) => l.product.isSample).length;
  return preview === 0 ? "live" : preview === lines.length ? "preview" : "mixed";
}
