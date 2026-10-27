import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFrom, warnIfProxyUntrusted } from "@/lib/request";

/**
 * Edge of the app: rate limiting for auth/search/AI endpoints and an Origin check
 * (CSRF defence) on state-changing API requests. Server Actions already verify
 * Origin against Host inside Next.js. Authorization happens next to the data.
 */
const LIMITS: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/auth/callback/credentials", limit: 10, windowMs: 60_000 },
  { prefix: "/api/auth", limit: 60, windowMs: 60_000 },
  { prefix: "/api/search", limit: 120, windowMs: 60_000 },
  { prefix: "/search", limit: 120, windowMs: 60_000 },
  { prefix: "/api/assistant", limit: 20, windowMs: 60_000 },
  { prefix: "/api/try-on", limit: 20, windowMs: 60_000 },
  { prefix: "/api/v1", limit: 300, windowMs: 60_000 },
];

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
// Machine-to-machine endpoints authenticate with API keys / signatures instead of cookies.
const CSRF_EXEMPT = ["/api/v1/", "/api/webhooks/", "/api/jobs/"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  warnIfProxyUntrusted();
  const ip = clientIpFrom(req.headers);
  const rule = LIMITS.find((l) => pathname.startsWith(l.prefix));
  // No trustworthy IP → skip per-IP limits (per-account limits in auth still apply).
  if (ip && rule && (rule.prefix !== "/search" || SAFE.has(req.method))) {
    const res = rateLimit(`${rule.prefix}:${ip}`, rule.limit, rule.windowMs);
    if (!res.ok) {
      return new NextResponse(JSON.stringify({ error: "Too many requests. Please slow down." }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(Math.ceil((res.resetAt - Date.now()) / 1000)) },
      });
    }
  }

  if (pathname.startsWith("/api/") && !SAFE.has(req.method) && !CSRF_EXEMPT.some((p) => pathname.startsWith(p))) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return new NextResponse(JSON.stringify({ error: "Cross-site request blocked" }), { status: 403, headers: { "content-type": "application/json" } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/search"],
};
