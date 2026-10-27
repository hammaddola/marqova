/** Listing quality score (0–100) shown in Seller Hub, with actionable tips. */
export type ListingInput = {
  title: string;
  description: string;
  bullets: string[];
  imageCount: number;
  has3d: boolean;
  attributesFilled: number;
  attributesRequired: number;
  hasBrand: boolean;
};

export function listingQuality(p: ListingInput) {
  const tips: string[] = [];
  let score = 0;
  const titleLen = p.title.trim().length;
  if (titleLen >= 30 && titleLen <= 150) score += 15;
  else tips.push("Use a descriptive title between 30 and 150 characters.");
  if (p.description.trim().length >= 200) score += 15;
  else tips.push("Write a description of at least 200 characters.");
  const bullets = p.bullets.filter((b) => b.trim()).length;
  score += Math.min(bullets, 5) * 3;
  if (bullets < 5) tips.push("Add five “About this item” bullets.");
  score += Math.min(p.imageCount, 6) * 4;
  if (p.imageCount < 6) tips.push("Add at least 6 images from different angles.");
  if (p.has3d) score += 10;
  else tips.push("Upload a 3D model (GLB) to enable View in 3D.");
  const ratio = p.attributesRequired ? p.attributesFilled / p.attributesRequired : 1;
  score += Math.round(Math.min(1, ratio) * 16);
  if (ratio < 1) tips.push("Fill in every required attribute so shoppers can filter to you.");
  if (p.hasBrand) score += 5;
  else tips.push("Add a brand (or “Unbranded”).");
  return { score: Math.min(100, score), tips };
}
