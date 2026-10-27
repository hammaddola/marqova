# Architecture decisions

Decisions made while building Marqova, with the reasoning behind each, so future contributors know what was deliberate.

### D1. Next.js 16 with `cacheComponents` turned off
Next 16 scaffolds with Cache Components (PPR + `use cache`) enabled. Almost every Marqova page reads the database or the session (cart count and delivery city live in the header), so we use the classic dynamic model. Builds then never need a live database, and redirects and 404s return real HTTP status codes. Hot read paths are cached explicitly with `unstable_cache` (category tree, AI review summaries). Revisit once the catalog is stable: product and category shells are good PPR candidates.

### D2. Tailwind v4 tokens live in CSS (`@theme`), not `tailwind.config`
Tailwind v4 has no JS config by default. All brand tokens (`navy-900`, `gold-500`, `ivory`, `emerald`, `crimson`…) are defined once in `src/app/globals.css`. They work as utilities (`bg-gold-500`) and as CSS variables (`var(--color-gold-500)`), which meets the spirit of "tokens in config and CSS variables".

### D3. shadcn-style components built directly on Radix (`radix-ui`)
We wrote the handful of primitives we need (button, form fields, dialog, drawer, tabs, hover card, tooltip) in `src/components/ui`, following shadcn conventions (`cva`, `cn`). This avoids the interactive CLI and keeps the brand rules (one gold action, 44px targets, 8px radius) in one place.

### D4. Money as integer paisa, computed on the server
Floats never touch prices. `computeTotals` is the single source of truth for cart, checkout and the order record. The client only chooses options; the server recomputes totals for every delivery option.

### D5. Auth.js v5 with JWT sessions and no database adapter
Credentials sign-in requires JWT sessions. Google users are upserted in the `signIn` callback. The role is loaded into the token on sign-in and on `update`, and every privileged action re-checks role and ownership against the database.

### D6. Prisma 7 with the `pg` driver adapter
Prisma 7 runs without the Rust query engine and uses `prisma.config.ts`. The generated client lives in `src/generated/prisma` (git-ignored, generated on `postinstall`).

### D7. Search adapter with a PostgreSQL fallback
`SearchAdapter` abstracts Meilisearch. When `MEILI_HOST` is empty or the engine is down, the PostgreSQL adapter serves the same contract, so development needs no extra service and production degrades gracefully. OpenSearch can be added behind the same interface.

### D8. Page-number pagination for shoppers, cursors for big back-office tables
Shoppers expect numbered result pages, and Meilisearch paginates by page. Seller listings, account orders, admin users and the Seller API use cursor pagination, which stays fast on million-row tables.

### D9. Priority job queue in PostgreSQL instead of Redis/BullMQ
One less service to run. `FOR UPDATE SKIP LOCKED` gives safe concurrent workers, the `priority` column orders work (critical emails before re-indexing), and failures retry with backoff. Swap in a dedicated queue only if throughput demands it.

### D10. Sponsored results are capped and labelled
At most 2 sponsored results per search page, always marked "Sponsored". Trust over ad revenue is the product's edge.

### D11. Deals are real price cuts
A flash deal moves the current price to `compareAtPrice` and records the new price in `PriceHistory`, so the "was" price and the price-history chart can't be faked.

### D12. Try-On Studio uses an explainable fit engine
`src/lib/fit.ts` estimates measurements from height, weight, body type and shape, then compares them to size charts per region. The result drives the 3D fit map, recommended size and advice text. A photo-real AI try-on plugs in through `TryOnProvider`. The shopper's photo is sent per request and never stored.

### D13. Sample product imagery is generated
Real photos of real brands would break the honesty rules. `/sample/[kind].svg` generates consistent, clearly labelled artwork per category and colour. 3D sample models come from the Khronos glTF sample repository (CC licences) and are listed in CONTENT_TODO.md.

### D14. Rate limiting in `proxy.ts` is per-instance
Fine for a single node and for development. For horizontal scaling, back `src/lib/rate-limit.ts` with Redis/Upstash (tracked in PRIORITY_QUEUE.md).

### D15. Embedded PostgreSQL for machines without Docker
`npm run db:embedded` starts PostgreSQL from `node_modules` on port 5433, so contributors without Docker can still run everything.

### D17. Login throttling favours safety over convenience
Failed sign-ins are capped at 8 per email + IP and 20 per email (any IP) per 15 minutes. Attempts are reserved before the password check and refunded on success, so concurrent requests can't race past the limit. The trade-off: someone hammering your email can lock it for 15 minutes; the alternative is unlimited distributed guessing. Forwarded IP headers are trusted only with `TRUST_PROXY=true`, which production requires (`src/instrumentation.ts` refuses to start without it). Limits never fail open: without a trusted IP (development), clients share a coarse fallback bucket with 20× the budget. A per-client cap on failures across all emails (30 / 15 min) throttles password spraying. Counters are in memory per instance; move them to Redis when scaling out (PRIORITY_QUEUE P0-6), and consider CAPTCHA after a few failures.

### D16. Above-the-fold entrances use CSS, not JavaScript
Motion animates below-the-fold reveals, menus, drawers, the cart badge and step transitions. The hero headline and product grids use a CSS keyframe, so the Largest Contentful Paint never waits for hydration. Heavy below-the-fold widgets (Recharts price history, reviews, Q&A) are code-split.
