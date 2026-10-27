/**
 * Background worker for the priority job queue. Polls POST /api/jobs/run so job
 * handlers run inside the app (same code, same env). Run one or more copies:
 *   npm run jobs:work
 * In production, a platform cron hitting /api/jobs/run every minute also works.
 */
import "dotenv/config";

const base = process.env.WORKER_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.JOBS_SECRET;
const interval = Number(process.env.WORKER_INTERVAL_MS ?? 5000);

if (!secret) {
  console.error("JOBS_SECRET is not set");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${base}/api/jobs/run?limit=20`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
    const data = (await res.json()) as { processed?: number; error?: string };
    if (!res.ok) console.error(`[worker] ${res.status} ${data.error ?? ""}`);
    else if (data.processed) console.log(`[worker] processed ${data.processed} job(s)`);
    // Drain quickly while there is work; otherwise wait.
    setTimeout(tick, data.processed ? 200 : interval);
  } catch (err) {
    console.error("[worker]", (err as Error).message);
    setTimeout(tick, interval);
  }
}

console.log(`[worker] polling ${base} every ${interval}ms`);
tick();
