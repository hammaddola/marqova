# Priority queue — what's next

The product backlog, ordered by priority. **P0** blocks a real launch, **P1** is needed soon after, **P2** is high-value improvement, **P3** is nice to have. Pick from the top, and move an item to "Done" with a link to its PR when it ships.

> Engineering note: background *work* also runs on a priority queue. See "Background jobs" in the README (`src/server/jobs.ts`).

## P0 — before launch

| # | Item | Why | Pointers |
|---|---|---|---|
| P0-1 | Replace all sample content and remove demo accounts | Honesty rules; demo admin password is public | CONTENT_TODO.md |
| P0-2 | Lawyer review of terms, privacy, seller agreement, returns | Legal exposure | `src/lib/legal.ts` |
| P0-3 | Real payment provider(s) live (Stripe and/or JazzCash/Easypaisa adapters), remove `mock` from production | Take real money safely | `src/lib/providers/payment` |
| P0-4 | Courier integration for labels, tracking events and delivered webhooks | Today "Confirm delivered" is manual and labels are generic | `advanceOrderItems`, `/seller/orders/[id]/label` |
| P0-5 | Email verification and password reset flows | Account security and recovery | `src/auth.ts`, add token table |
| P0-6 | Shared rate-limit store (Redis/Upstash) | In-memory limiter is per-instance | `src/lib/rate-limit.ts`, `src/proxy.ts` |
| P0-7 | Performance pass to Lighthouse 90+ on mobile (measured 50–78 on a throttled dev laptop; Accessibility 96–100, SEO 100) | Spec quality bar | Self-host `model-viewer`/three on demand, trim client JS in header, PPR for product shells, real CDN images |
| P0-8 | Error monitoring and structured logs (Sentry / OpenTelemetry) | Can't support what we can't see | `src/app/error.tsx`, jobs runner |
| P0-9 | Backups and migration runbook for PostgreSQL | Data safety | ops |

## P1 — first month

| # | Item | Pointers |
|---|---|---|
| P1-1 | Seller-provided size charts per product, used by the fit engine and size guide | `Product.sizeGuide`, `src/lib/fit.ts` |
| P1-2 | Sponsored CPC billing: charge on click, enforce daily budget, click tracking endpoint | `SponsoredCampaign`, `getSponsored` |
| P1-3 | Automated weekly payout job (create `Payout` rows from delivered items minus fees and refunds) | `src/lib/fees.ts`, jobs |
| P1-4 | Refund execution through the payment provider on return approval | `PaymentProvider.refund`, `decideReturn` |
| P1-5 | Excel (.xlsx) upload directly, not only CSV | `src/server/bulk.ts` (SheetJS) |
| P1-6 | Notifications center UI + email preferences | `Notification` model |
| P1-7 | Search analytics (zero-result queries, popular searches → trending) | search-bar trending list is static |
| P1-8 | Product variants by image (color → gallery images) | `ProductMedia.color` |
| P1-9 | Seller response-time measurement from real messages | `Store.responseTimeHours`, trust job |

## P2 — growth

| # | Item |
|---|---|
| P2-1 | Real AI try-on provider (photo-real garment transfer) behind `TryOnProvider` |
| P2-2 | Visual search with image embeddings (replace dominant-colour matching) |
| P2-3 | Personalised recommendations (co-view / co-buy model) replacing bestsellers in "Recommended for you" |
| P2-4 | Urdu localisation and RTL support; multi-currency display |
| P2-5 | PWA: offline cart, install prompt, push notifications for price drops |
| P2-6 | Seller multi-user accounts with permissions (staff roles) |
| P2-7 | Product bundles and "buy together" discounts |
| P2-8 | Advanced fraud: device fingerprinting, velocity checks on checkout and reviews |
| P2-9 | OpenSearch adapter for very large catalogs |

## P3 — nice to have

| # | Item |
|---|---|
| P3-1 | Live chat (WebSocket) between shoppers and sellers |
| P3-2 | AR try-on for accessories (face tracking for eyewear) |
| P3-3 | Gift cards and store credit |
| P3-4 | Public seller ratings API and embeddable Trust Score badge |
| P3-5 | Dark mode for the whole store (Try-On Studio is already dark) |

## Done (v0.1)

- Storefront: home, search with facets, category pages, product page (gallery, zoom, 3D/AR, price history, alerts, variants, buy box, FBT, Q&A, verified reviews with AI summary), cart, guest checkout, confirmation and email, account area
- Try-On Studio with 3D avatar, fit map, recommended size, photo try-on (mock), saved avatars with consent
- Seller Hub: onboarding and verification, listings table with bulk actions, add-product wizard with variant matrix and quality score, list-from-photo AI, bulk CSV with validation report, multi-warehouse inventory, orders/labels, returns, messages, promotions (coupons, flash deals, sponsored), analytics, payouts and fee calculator, Seller REST API with keys
- Admin: seller approvals, counterfeit-flagged listing moderation, review moderation, no-code categories and attribute templates, commissions, disputes, homepage sections, users, job queue
- Trust Score, review fraud detection, priority job queue, security headers, CSRF and rate limiting, unit and e2e tests, CI
