import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTryOn } from "@/lib/providers/tryon";
import { siteUrl } from "@/lib/utils";

const schema = z.object({
  productId: z.string().min(1),
  personPhoto: z.string().startsWith("data:image/").max(8_000_000).optional().nullable(),
  avatar: z.object({ body: z.enum(["MEN", "WOMEN", "KIDS"]), heightCm: z.number().min(80).max(220), weightKg: z.number().min(12).max(200), shape: z.enum(["SLIM", "ATHLETIC", "REGULAR", "BROAD"]) }),
});

/**
 * Renders a try-on preview. The shopper's photo is sent in the request body,
 * forwarded to the provider and never stored by Marqova.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { title: true, tryOnType: true, media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 1, select: { url: true } } },
  });
  if (!product || product.tryOnType === "NONE") return NextResponse.json({ error: "Try-on isn't available for this item." }, { status: 404 });
  const img = product.media[0]?.url ?? "";
  const result = await getTryOn().render({
    garmentImageUrl: img.startsWith("/") ? siteUrl(img) : img,
    garmentTitle: product.title,
    personPhotoUrl: parsed.data.personPhoto,
    avatar: parsed.data.avatar,
  });
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
