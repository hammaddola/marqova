import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

const localStorage: StorageAdapter = {
  async put(key, body) {
    const file = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/uploads/${key}`;
  },
  async remove(key) {
    await unlink(path.join(process.cwd(), "public", "uploads", key)).catch(() => {});
  },
};

function s3Storage(): StorageAdapter {
  const bucket = process.env.S3_BUCKET!;
  const publicBase = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  const client = import("@aws-sdk/client-s3").then(
    ({ S3Client }) =>
      new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
      }),
  );
  return {
    async put(key, body, contentType) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await (await client).send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
      return `${publicBase}/${key}`;
    },
    async remove(key) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await (await client).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export function getStorage(): StorageAdapter {
  return process.env.STORAGE_DRIVER === "s3" && process.env.S3_BUCKET ? s3Storage() : localStorage;
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MODEL_TYPES = ["model/gltf-binary", "application/octet-stream"];

/** Resizes an uploaded image to a large WebP and a thumbnail. Returns their URLs. */
export async function storeImage(file: File, prefix: string) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Unsupported image type");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 15 MB");
  const sharp = (await import("sharp")).default;
  const input = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const storage = getStorage();
  const [large, thumb] = await Promise.all([
    sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(input).rotate().resize({ width: 400, height: 400, fit: "cover" }).webp({ quality: 75 }).toBuffer(),
  ]);
  const [url, thumbUrl] = await Promise.all([
    storage.put(`${prefix}/${id}.webp`, large, "image/webp"),
    storage.put(`${prefix}/${id}-thumb.webp`, thumb, "image/webp"),
  ]);
  return { url, thumbUrl, key: `${prefix}/${id}.webp` };
}

export async function storeFile(file: File, prefix: string, ext: string) {
  if (file.size > MAX_UPLOAD_BYTES * 3) throw new Error("File is too large");
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const url = await getStorage().put(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  return { url, key };
}
