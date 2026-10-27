import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { buildSearchDocuments, configureMeiliIndex, getMeiliClient } from "@/server/search";
import { getSessionUser } from "@/server/session";

/** Rebuilds the Meilisearch index. Admins (session) or ops (JOBS_SECRET bearer token). */
export async function POST(req: Request) {
  const secret = process.env.JOBS_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const bySecret = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!bySecret && (await getSessionUser())?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getMeiliClient();
  if (!client) return NextResponse.json({ error: "MEILI_HOST is not configured; search is using PostgreSQL." }, { status: 400 });
  const keys = (await db.attributeDefinition.findMany({ where: { filterable: true }, distinct: ["key"], select: { key: true } })).map((k) => k.key);
  await configureMeiliIndex(client, keys);
  const docs = await buildSearchDocuments();
  for (let i = 0; i < docs.length; i += 1000) await client.index("products").addDocuments(docs.slice(i, i + 1000), { primaryKey: "id" });
  return NextResponse.json({ indexed: docs.length });
}
