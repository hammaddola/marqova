/**
 * Runs once when the server starts. Production must sit behind a proxy/platform that
 * overwrites X-Real-IP / X-Forwarded-For; otherwise per-client rate limits can't work.
 */
export function register() {
  if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY !== "true") {
    throw new Error(
      "TRUST_PROXY must be \"true\" in production (deploy behind Vercel, nginx, Cloudflare or another proxy that sets X-Real-IP). See README → Deploying.",
    );
  }
}
