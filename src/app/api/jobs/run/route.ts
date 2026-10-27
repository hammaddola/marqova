import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runJobs } from "@/server/jobs";

/** Worker endpoint for the priority job queue. Call from a cron (every minute) with the JOBS_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.JOBS_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runJobs(Number(new URL(req.url).searchParams.get("limit") ?? 20));
  return NextResponse.json({ processed: results.length, results });
}
