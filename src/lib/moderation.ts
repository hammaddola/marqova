/**
 * Counterfeit risk heuristics for the admin moderation queue. Flags are hints for
 * a human moderator, never automatic takedowns. An AI image/text classifier can
 * add flags through the same shape.
 */
const PROTECTED_BRANDS = ["nike", "adidas", "apple", "samsung", "gucci", "louis vuitton", "rolex", "chanel", "sony", "dior", "prada", "puma", "ray-ban", "zara", "khaadi", "sapphire"];
const REPLICA_TERMS = ["replica", "first copy", "master copy", "1:1", "aaa quality", "mirror quality", "copy of", "inspired by", "dupe", "fake"];

export type ListingFlag = { code: "REPLICA_TERMS" | "BRAND_MISMATCH" | "PRICE_TOO_LOW"; detail: string };

export function counterfeitFlags(p: { title: string; description: string; brand: string | null; price: number }, categoryMedianPrice: number | null): ListingFlag[] {
  const text = `${p.title} ${p.description}`.toLowerCase();
  const flags: ListingFlag[] = [];
  const term = REPLICA_TERMS.find((t) => text.includes(t));
  if (term) flags.push({ code: "REPLICA_TERMS", detail: `Mentions “${term}”` });
  const brand = (p.brand ?? "").toLowerCase();
  const mentioned = PROTECTED_BRANDS.find((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
  if (mentioned && !brand.includes(mentioned)) flags.push({ code: "BRAND_MISMATCH", detail: `Title mentions ${mentioned} but brand is “${p.brand ?? "none"}”` });
  if (categoryMedianPrice && p.price < categoryMedianPrice * 0.3) flags.push({ code: "PRICE_TOO_LOW", detail: `Price is under 30% of the category median` });
  return flags;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
