/**
 * Client IP for rate limiting. `x-real-ip` and the right-most `x-forwarded-for`
 * hop are set by our own proxy/platform; left-most hops are client-controlled
 * and must not be trusted.
 */
export function clientIpFrom(headers: Headers) {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  return hops[hops.length - 1] ?? "local";
}

/** Only same-site relative paths are allowed as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Backslashes and control characters can be normalised by browsers into "//host".
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://marqova.local");
    if (url.origin !== "http://marqova.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
