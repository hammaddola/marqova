import { NextResponse } from "next/server";
import { storeFile, storeImage } from "@/lib/providers/storage";
import { assertSeller } from "@/server/session";

/**
 * Seller media upload. Images are resized to WebP with sharp; GLB/USDZ 3D models
 * and MP4 videos are stored as-is (S3-compatible storage or local disk).
 */
export async function POST(req: Request) {
  const ctx = await assertSeller().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Seller account required" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });
  const prefix = `stores/${ctx.store.id}`;
  try {
    const name = file.name.toLowerCase();
    if (name.endsWith(".glb")) return NextResponse.json({ type: "MODEL_3D", ...(await storeFile(file, `${prefix}/models`, "glb")) });
    if (name.endsWith(".usdz")) return NextResponse.json({ type: "MODEL_3D", ...(await storeFile(file, `${prefix}/models`, "usdz")) });
    if (file.type === "video/mp4") return NextResponse.json({ type: "VIDEO", ...(await storeFile(file, `${prefix}/videos`, "mp4")) });
    const img = await storeImage(file, `${prefix}/images`);
    return NextResponse.json({ type: "IMAGE", url: img.url, thumbUrl: img.thumbUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
