/**
 * Client IP for rate limiting, or null when it can't be known reliably.
 * `x-real-ip` and the right-most `x-forwarded-for` hop are only trustworthy when
 * our own proxy/platform overwrites them (TRUST_PROXY=true). Callers must SKIP
 * per-IP limits on null — never fall back to one shared bucket, which would let
 * a single client throttle everyone.
 */
export function clientIpFrom(headers: Headers, trustProxy = process.env.TRUST_PROXY === "true"): string | null {
  if (!trustProxy) return null;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  return hops[hops.length - 1] ?? null;
}

let warned = false;
/** Logs once in production when per-IP rate limiting is disabled. */
export function warnIfProxyUntrusted() {
  if (warned || process.env.NODE_ENV !== "production" || process.env.TRUST_PROXY === "true") return;
  warned = true;
  console.warn("[security] TRUST_PROXY is not set: per-IP rate limits are disabled. Set TRUST_PROXY=true behind a proxy/platform that overwrites X-Real-IP / X-Forwarded-For.");
}

/** Only same-site relative paths are allowed as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Backslashes and control characters can be normalised by browsers into "//host".
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://marqova.local");
    if (url.origin !== "http://marqova.local") return fallback;
    // Validate the normalised output too: "/.//evil.com" normalises to "//evil.com".
    const out = `${url.pathname}${url.search}${url.hash}`;
    if (out.startsWith("//") || out.includes("\\")) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
