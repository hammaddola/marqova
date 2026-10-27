/**
 * Rebuilds the Meilisearch index from PostgreSQL. Requires the app to be running
 * and MEILI_HOST to be configured.   npm run search:reindex
 */
import "dotenv/config";

const base = process.env.WORKER_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function main() {
  const res = await fetch(`${base}/api/search/reindex`, { method: "POST", headers: { authorization: `Bearer ${process.env.JOBS_SECRET ?? ""}` } });
  console.log(res.status, await res.text());
  process.exit(res.ok ? 0 : 1);
}

main();
