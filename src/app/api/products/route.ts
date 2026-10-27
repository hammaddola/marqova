import { NextResponse } from "next/server";
import { getProductsByIds } from "@/server/catalog";

/** Product cards by id (recently viewed, compare). Public, read-only. */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]{10,40}$/i.test(s))
    .slice(0, 24);
  const items = await getProductsByIds(ids);
  return NextResponse.json({ items }, { headers: { "cache-control": "private, max-age=60" } });
}
