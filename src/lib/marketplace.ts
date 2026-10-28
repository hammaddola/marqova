/**
 * Marketplace mode. "single" (default): one seller, the owner; seller sign-up is closed and
 * every "Sell on Marqova" entry point is hidden. "multi": open to verified third-party sellers.
 * NEXT_PUBLIC_ so client components read the same value; it is inlined at build time.
 */
export const MULTI_SELLER = process.env.NEXT_PUBLIC_MARKETPLACE_MODE === "multi";
