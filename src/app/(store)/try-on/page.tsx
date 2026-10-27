import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Studio, type StudioProduct } from "@/components/tryon/studio";
import { getSessionUser } from "@/server/session";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Try-On Studio",
  description: "Create an avatar from your height, weight and body shape, try clothes on in 3D and get a recommended size with a fit map.",
  alternates: { canonical: "/try-on" },
};

export default async function TryOnPage({ searchParams }: PageProps<"/try-on">) {
  const productId = firstParam((await searchParams).product);
  const user = await getSessionUser();
  const [rows, avatar] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", tryOnType: { in: ["TOP", "BOTTOM", "DRESS", "SHOES"] } },
      orderBy: [{ salesCount: "desc" }],
      take: 40,
      select: {
        id: true, slug: true, title: true, basePrice: true, tryOnType: true,
        media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 1, select: { url: true } },
        variants: { where: { isActive: true }, select: { id: true, options: true, colorHex: true, stock: true } },
      },
    }),
    user ? db.avatarProfile.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : null,
  ]);
  // Make sure the requested product is in the list even if it isn't a top seller.
  if (productId && !rows.some((r) => r.id === productId)) {
    const extra = await db.product.findFirst({ where: { id: productId, status: "ACTIVE", tryOnType: { not: "NONE" } }, select: { id: true, slug: true, title: true, basePrice: true, tryOnType: true, media: { where: { type: "IMAGE" }, take: 1, select: { url: true } }, variants: { where: { isActive: true }, select: { id: true, options: true, colorHex: true, stock: true } } } });
    if (extra && extra.tryOnType !== "ACCESSORY") rows.unshift(extra);
  }
  const products: StudioProduct[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    price: r.basePrice,
    image: r.media[0]?.url ?? null,
    kind: r.tryOnType as StudioProduct["kind"],
    variants: r.variants.map((v) => {
      const o = v.options as Record<string, string>;
      return { id: v.id, size: o.size ?? null, color: o.color ?? null, colorHex: v.colorHex, stock: v.stock };
    }),
  }));

  return (
    <>
      <h1 className="sr-only">Try-On Studio</h1>
      <Studio products={products} initialProductId={productId} savedAvatar={avatar ? { body: avatar.body, heightCm: avatar.heightCm, weightKg: avatar.weightKg, shape: avatar.shape } : null} signedIn={!!user} />
    </>
  );
}
