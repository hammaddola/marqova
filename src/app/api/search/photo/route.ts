import { NextResponse } from "next/server";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/providers/storage";

/**
 * Search by photo. Finds the dominant colour of the uploaded image with sharp and
 * maps it to the catalog's colour facet. The photo is never stored.
 * A visual-embedding search service can replace this behind the same endpoint.
 */
const PALETTE: Record<string, [number, number, number]> = {
  Black: [26, 26, 26], White: [244, 244, 242], Navy: [28, 42, 64], Olive: [91, 107, 58], Maroon: [110, 31, 42], Sand: [216, 201, 168],
  Sky: [127, 167, 201], Rose: [201, 138, 148], Charcoal: [60, 64, 72], Emerald: [31, 122, 90], Gold: [200, 162, 74], Silver: [184, 188, 194],
};

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Upload a JPG, PNG or WebP under 15 MB." }, { status: 400 });
  }
  const sharp = (await import("sharp")).default;
  const { dominant } = await sharp(Buffer.from(await file.arrayBuffer())).resize(64, 64, { fit: "cover" }).stats();
  let best = "Black";
  let bestDist = Infinity;
  for (const [name, [r, g, b]] of Object.entries(PALETTE)) {
    const d = (r - dominant.r) ** 2 + (g - dominant.g) ** 2 + (b - dominant.b) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return NextResponse.json({ color: best, href: `/search?a_color=${encodeURIComponent(best)}&visual_source=photo` });
}
