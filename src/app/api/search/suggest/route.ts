import { NextResponse } from "next/server";
import { suggest } from "@/server/search";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ items: [] });
  const items = await suggest(q);
  return NextResponse.json({ items }, { headers: { "cache-control": "public, max-age=30" } });
}
