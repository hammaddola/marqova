# Content to replace before launch

Everything below is **sample or template content** for development and demos. None of it describes real businesses, products or customers.

## Sample data (prisma/seed.ts)

Every seeded record has `isSample: true` where the model supports it.

- [ ] **Preview catalog.** In single-seller mode (default) one store, "Marqova", sells products under eight invented house brands (Northline, Shahpar Tech, Hearth & Loom, Indus Craft, Fieldhouse, Daily Pantry, Gulnar Beauty, Roadwise); in multi-seller mode each brand is its own store. Brand names were checked against obvious trademark clashes but not formally searched; run a trademark search before using any of them for real. While any of these listings is active the site shows a preview notice.
- [ ] **129 preview products** across 14 root categories and 31 sub-categories, with complete descriptions, bullets and consistent specs (`prisma/catalog-copy.ts`). The products don't exist; replace them with your real stock.
- [ ] **No customer reviews or Q&A are seeded** on shared databases. `SEED_SAMPLE_REVIEWS=true` adds ~570 labelled sample reviews for local UI work only. **Never present these as real.**
- [ ] **Sales counts, view counts and the delivery inputs of Trust Scores** are invented. Recompute from real data (the `trust.recompute` job does this per store).
- [ ] **Seller analytics** (`ProductDailyStat`), **payout history** (`PO-SAMPLE-*`), **sponsored campaign** stats and **flash deals**.
- [ ] **Demo users** `*@marqova.dev` and `sample.reviewer*@marqova.dev`. Remove them, especially `admin@marqova.dev` with its public password.
- [ ] **Coupons** `WELCOME10`, `FREESHIP`, `SAVE500` (plus `NORTHLINE15` in multi-seller mode).
- [ ] **Homepage sections** (2 seeded rows).

## Media

- [ ] **Product images** are generated SVG illustrations from `/sample/[kind].svg`. Replace them with your own photography (6+ angles per product).
- [ ] **3D models**: only four public-domain (CC0) Khronos glTF samples are used (BoomBox, WaterBottle, ToyCar, Avocado; licences checked 2026-10-28), loaded from raw.githubusercontent.com. Replace them with your own GLB/USDZ files and drop `raw.githubusercontent.com` from the CSP `connect-src` in `next.config.ts`.
- [ ] **Logo**: the wordmark is typeset in Playfair Display (SIL Open Font Licence) and the favicon (`src/app/icon.svg`) is a simple "M" mark. Commission a final logo and favicon set.
- [ ] **Open Graph images**: add `opengraph-image` files for the home and category pages.

## Templates — review with a lawyer before launch

- [ ] Terms of use (`/legal/terms`)
- [ ] Privacy notice (`/legal/privacy`): add data controller, retention periods, applicable law (e.g. Pakistan PECA / PDPB, GDPR if selling to the EU)
- [ ] Seller agreement (`/legal/seller-agreement`): reserves, chargebacks, prohibited items, IP/counterfeit policy
- [ ] Returns & refund policy (`/legal/returns`)
- [ ] Cookie notice / consent banner if analytics or ads are added

Source: `src/lib/legal.ts`. Each template shows a "Template — review with a lawyer before launch" banner until `template: false` is set.

## Business configuration

- [ ] Commission rates per category (Admin → Categories). Seeded values are placeholders.
- [ ] Fixed per-item fee (Rs 25) and payment processing (2%) in `src/lib/fees.ts` / `FeeRule`.
- [ ] Free-delivery threshold (Rs 2,500) and express surcharge in `src/lib/delivery.ts`.
- [ ] Remote-city delivery adjustments (`FAR_CITIES`), or replace with a courier API.
- [ ] Size charts in `src/lib/fit.ts`. Let sellers supply their own (see PRIORITY_QUEUE.md).
- [ ] Protected-brand list for counterfeit flags in `src/lib/moderation.ts`.
- [ ] Email copy (`src/lib/providers/email`, `src/server/orders.ts`).
