# Marqova — See it. Trust it. Own it.

A premium multi-vendor marketplace for **every niche** — fashion, electronics, home, beauty, sports, kids, grocery, auto, books, handmade, pets, wholesale and any category an admin adds later — built to beat the big marketplaces on **trust, clarity and visual shopping**.

- **Trust Score (0–100)** for every seller and product, with the exact breakdown on hover
- **Verified-buyer reviews only**, with burst and duplicate-text detection
- **Full price upfront**: delivery cost and date on every card, no fees added at checkout
- **View in 3D** (`<model-viewer>`, AR on phones) and a **Try-On Studio** (React Three Fiber avatar, fit map, size recommendation)
- **Seller Hub** on par with Seller Central: add-product wizard with variant matrix, list-from-a-photo AI, bulk CSV with row-level reports, multi-warehouse inventory, orders and labels, returns, promotions, analytics, payouts and a REST API
- **Admin panel**: seller verification, AI-assisted counterfeit and fake-review moderation, no-code categories and attribute templates, commissions, disputes, homepage sections, users, and a job-queue console

> ⚠️ All stores, products, reviews, ratings and statistics in the seed are **fictional sample data**, clearly labelled. See [CONTENT_TODO.md](CONTENT_TODO.md).

---

## Contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Demo logins](#demo-logins-development-only)
4. [Architecture](#architecture)
5. [Environment variables](#environment-variables)
6. [Adding a new category / niche](#adding-a-new-category--niche)
7. [Plugging in real providers](#plugging-in-real-providers)
8. [Background jobs (priority queue)](#background-jobs-priority-queue)
9. [Testing & quality](#testing--quality)
10. [Deploying](#deploying)
11. [Project docs](#project-docs)

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server Actions) · React 19 · TypeScript (strict) |
| UI | Tailwind CSS v4 design tokens · Radix primitives (shadcn-style components) · lucide-react |
| Motion & UX | **Motion** (`motion/react`) for page/list/stagger/spring animations · **Sonner** toasts · **Vaul** drawers · **Embla** carousels · **Recharts** |
| Data | PostgreSQL · Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (email + password, Google) · roles `SHOPPER`, `SELLER`, `ADMIN` |
| Search | Meilisearch via a `SearchAdapter` (PostgreSQL fallback when Meilisearch isn't configured) |
| Forms | Zod 4 + React Hook Form; Zod on every server action and API route |
| Media | S3-compatible storage adapter (local disk in dev) · `sharp` resizing to WebP |
| 3D | Google `<model-viewer>` (GLB/USDZ, AR) · React Three Fiber + drei |
| Providers | `PaymentProvider` (Stripe, Cash on Delivery, mock) · `TryOnProvider` (mock, HTTP) · `AIProvider` (mock, Anthropic) |
| Tests | Vitest (unit) · Playwright (e2e, desktop + mobile) |

## Quick start

**Requirements:** Node.js 22+ (24 recommended), and either Docker *or* nothing else (see option B).

```bash
# 1. Database (+ Meilisearch)
docker compose up -d                 # Option A: PostgreSQL on :5432 and Meilisearch on :7700
# npm run db:embedded                # Option B: no Docker — runs PostgreSQL on :5433 from node_modules

# 2. Configure
cp .env.example .env                 # then set AUTH_SECRET (npx auth secret)
#   Option B users: DATABASE_URL="postgresql://marqova:marqova@localhost:5433/marqova"

# 3. Install, migrate, seed, run
npm install
npx prisma migrate dev
npm run seed
npm run dev                          # http://localhost:3000
```

Optional:

```bash
npm run jobs:work        # background worker for the job queue (emails, bulk imports, indexing…)
npm run search:reindex   # push the catalog into Meilisearch (when MEILI_HOST is set)
```

## Demo logins (development only)

Password for all: **`Marqova123!`**

| Role | Email | What to try |
|---|---|---|
| Shopper | `shopper@marqova.dev` | Orders & tracking, write a verified review on the delivered order, wishlist, price alerts, saved avatar |
| Seller | `seller@marqova.dev` | Seller Hub for *Sample Store — Northline*: accept/pack/ship orders, add products, bulk upload, analytics |
| Admin | `admin@marqova.dev` | Approve *Pat Pending*'s seller application, flagged review queue, categories, job queue |
| Pending seller | `pending.seller@marqova.dev` | See the onboarding status screen |

Coupons: `WELCOME10`, `FREESHIP` (over Rs 1,500), `SAVE500` (over Rs 5,000), `NORTHLINE15` (Northline only).

## Architecture

```
src/
  app/
    (store)/            Storefront: home, /search, /c/[category], /p/[slug], /store/[slug], cart, checkout,
                        try-on, account/*, deals, compare, sell, legal/[doc], login/register
    seller/             Seller Hub (dashboard, listings, wizard, AI, bulk, inventory, orders, returns, …)
    admin/              Admin panel
    api/                Auth.js, search suggest/photo/reindex, assistant, try-on, upload,
                        v1 Seller API, jobs runner, Stripe webhook
    sample/[kind]       Generated SVG artwork for sample products
    sitemap.ts robots.ts
  components/           UI primitives (ui/), layout, product, search, seller, admin, try-on, motion helpers
  lib/                  Pure domain logic (pricing, fees, trust score, fit engine, review guard,
                        moderation, priority queue, rate limit) + providers/ (payment, ai, tryon, storage, email)
  server/               Server-only data layer: catalog, search adapters, cart, orders, products,
                        bulk import, jobs queue, session/role guards, server actions (actions/)
  proxy.ts              Rate limiting + CSRF Origin checks (Next 16 "proxy", formerly middleware)
prisma/                 schema.prisma (36 models), migrations, seed.ts
tests/unit, tests/e2e   Vitest and Playwright suites
scripts/                embedded-db, worker, reindex, smoke tests
```

**Key flows**

- *Prices* are integers in paisa. Totals are always recomputed on the server (`lib/pricing.ts`); the client never submits a price.
- *Checkout* reserves stock with an atomic conditional update inside a transaction, creates the order, then calls the payment provider. Stripe orders are confirmed only by the signed webhook.
- *Search* goes through `SearchAdapter`. Meilisearch handles typo tolerance and facets. If it's unset or unreachable, the PostgreSQL adapter serves the same API.
- *Authorization* is enforced next to the data: `requireUser` / `requireSeller` / `requireRole` in pages, and `assert*` in every server action and API route. Seller data is always scoped by `storeId`.

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Public base URL (metadata, sitemap, emails, Stripe redirects) |
| `AUTH_SECRET`, `AUTH_TRUST_HOST` | Auth.js session encryption |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional Google sign-in (button hidden when empty) |
| `MEILI_HOST`, `MEILI_MASTER_KEY` | Meilisearch. Empty = PostgreSQL search |
| `STORAGE_DRIVER`, `S3_*` | `local` or `s3` (AWS S3, Cloudflare R2, MinIO…) |
| `PAYMENT_PROVIDERS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Enabled payment methods (`mock,cod,stripe`) |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL` | `mock` (default) or `anthropic` |
| `TRYON_PROVIDER`, `TRYON_API_URL`, `TRYON_API_KEY` | `mock` (default) or `http` |
| `SMTP_*`, `EMAIL_FROM` | Email. Empty `SMTP_HOST` = log to console |
| `JOBS_SECRET` | Bearer token for `POST /api/jobs/run` and reindexing |

## Adding a new category / niche

No code required:

1. Sign in as an admin → **Admin → Categories & commissions → New category**.
2. Choose a parent (or top level), an icon, the **commission %** and, for apparel, the **try-on type**.
3. Open the category and **Add attribute** for each field sellers should fill in. Mark *Variant option* for axes such as color and size (they build the variant matrix). Mark *Search filter* to get a facet automatically, and *Required* to block publishing without it.
4. Sub-categories copy their parent's template when created.

The add-product wizard, bulk-upload CSV template, search facets and product spec table all read this template.

## Plugging in real providers

| Provider | Where | How |
|---|---|---|
| **Payments** | `src/lib/providers/payment/index.ts` | Implement `PaymentProvider` (`createPayment`, `refund`) and add it to `getPaymentProviders()`. Stripe is built in: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, add `stripe` to `PAYMENT_PROVIDERS`, and point a webhook at `/api/webhooks/stripe` (`checkout.session.completed`, `checkout.session.expired`). JazzCash/Easypaisa: same interface, redirect flow like Stripe. |
| **Virtual try-on** | `src/lib/providers/tryon/index.ts` | `TRYON_PROVIDER=http` POSTs `{ garmentImageUrl, personPhotoUrl, avatar }` to `TRYON_API_URL` and expects `{ imageUrl }`. Or implement `TryOnProvider` for a specific vendor SDK. |
| **AI** | `src/lib/providers/ai/index.ts` | `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` enables listing drafts, review summaries, natural-language search and the assistant. Add other LLMs by implementing `AIProvider`. |
| **Search** | `src/server/search.ts` | Implement `SearchAdapter` (e.g. OpenSearch) and return it from `getSearchAdapter()`. |
| **Storage** | `src/lib/providers/storage/index.ts` | `STORAGE_DRIVER=s3` with any S3-compatible endpoint; set `S3_PUBLIC_URL` to your CDN. |
| **Email** | `src/lib/providers/email/index.ts` | Set `SMTP_*` (works with SES, Postmark, Resend SMTP, etc.). |

## Background jobs (priority queue)

`src/server/jobs.ts` implements a durable **priority queue on PostgreSQL**: lower `priority` runs first (0 = critical … 9 = low), then oldest `runAt`. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, so several can run in parallel safely. Failures retry with exponential backoff, and stuck jobs are re-queued after 10 minutes. Within a batch, jobs are ordered by an in-memory binary heap (`src/lib/priority-queue.ts`).

| Job | Priority | Triggered by |
|---|---|---|
| `email.send` (order confirmation) | critical | Order placed |
| `search.index` / `search.remove`, `price-alerts.check` | high | Listing created/updated/priced |
| `bulk.import` | normal | CSV upload |
| `trust.recompute` | low | Delivery, cancellation, new review |

Run it with `npm run jobs:work`, or from a cron calling `POST /api/jobs/run` with `Authorization: Bearer $JOBS_SECRET`. In development, server actions also process jobs right after responding. Admins can watch and retry jobs at **Admin → Job queue**.

## Testing & quality

```bash
npm run lint          # ESLint (Next core-web-vitals + TypeScript + React Compiler rules)
npm run typecheck     # next typegen && tsc --noEmit
npm test              # Vitest: pricing, fees, Trust Score, review guard, fit engine, moderation, queue, rate limiter…
npm run test:e2e      # Playwright: guest checkout, search & filters, account tracking, try-on (mobile), seller wizard & fulfilment, admin
npm run build
bash scripts/smoke.sh # signs in as every role and checks ~58 routes return the right status
```

Accessibility: semantic landmarks, skip link, labelled controls, visible focus rings, keyboard-operable menus and dialogs (Radix), and `prefers-reduced-motion` respected (Motion `reducedMotion="user"` plus CSS). SEO: server rendering, per-page metadata and canonical URLs, Open Graph, JSON-LD (Organization, Product, AggregateOffer, AggregateRating, BreadcrumbList), `sitemap.xml`, `robots.txt`, clean URLs.

## Deploying

Any Node.js host works: Vercel, Render, Railway, Fly.io, or a VPS with Docker.

1. Provision PostgreSQL (Neon, Supabase, RDS…) and optionally Meilisearch Cloud, S3/R2 and SMTP.
2. Set the environment variables (production `AUTH_SECRET`; **remove `mock` from `PAYMENT_PROVIDERS`**).
3. Build and migrate: `npm ci && npx prisma migrate deploy && npm run build`, then `npm start`.
4. Schedule `POST /api/jobs/run` every minute (Vercel Cron, GitHub Actions, or `npm run jobs:work` as a separate process).
5. Configure the Stripe webhook and run `npm run search:reindex` once.
6. In-memory rate limiting works for one instance. For multiple instances, back `src/lib/rate-limit.ts` with Redis.

CI (`.github/workflows/ci.yml`) runs lint, type-check, unit tests, build and e2e against a PostgreSQL service on every push.

## Project docs

- [PRIORITY_QUEUE.md](PRIORITY_QUEUE.md) — prioritised roadmap of what's next (P0 → P3)
- [DECISIONS.md](DECISIONS.md) — architecture decisions and trade-offs
- [CONTENT_TODO.md](CONTENT_TODO.md) — sample content and templates to replace before launch
- [marqova-build-prompt.md](marqova-build-prompt.md) — the original product brief
