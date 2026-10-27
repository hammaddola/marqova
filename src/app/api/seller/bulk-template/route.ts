import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { buildTemplate } from "@/server/bulk";
import { assertSeller } from "@/server/session";

/** Downloadable CSV template for a category (opens in Excel / Google Sheets). */
export async function GET(req: Request) {
  const ctx = await assertSeller().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Seller account required" }, { status: 401 });
  const categoryId = new URL(req.url).searchParams.get("categoryId") ?? "";
  const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true, slug: true } });
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  const csv = await buildTemplate(category.id);
  return new NextResponse("﻿" + csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="marqova-${slugify(category.slug)}-template.csv"` },
  });
}
