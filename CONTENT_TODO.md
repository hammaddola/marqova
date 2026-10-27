# Content to replace before launch

Everything below is **sample or template content** for development and demos. None of it describes real businesses, products or customers.

## Sample data (prisma/seed.ts)

Every seeded record has `isSample: true` where the model supports it.

- [ ] **8 sample stores** named "Sample Store — Northline / Kestrel Tech / Hearth & Loom / Indus Craft / Fieldhouse / Daily Pantry / Lumen Beauty / Roadwise". Delete or replace them with real, verified sellers.
- [ ] **129 sample products** across 14 root categories and 31 sub-categories. Titles, bullets, descriptions and specs are fictional, and every bullet list includes "SAMPLE LISTING".
- [ ] **Fictional brands** ("Sample Atelier X", "Sample Works Q"…).
- [ ] **~570 sample reviews** and their sample orders. Each review ends with "(Sample review — not from a real customer.)" and shows a "Sample review" badge. **Never present these as real.** Delete them all before launch:
      `DELETE FROM "Review" WHERE "isSample"; DELETE FROM "Order" WHERE "isSample";`
- [ ] **Ratings, sales counts, view counts and Trust Scores** derived from the above. Recompute from real data (the `trust.recompute` job does this per store).
- [ ] **Sample Q&A** (marked with a "Sample" badge).
- [ ] **Seller analytics** (`ProductDailyStat`), **payout history** (`PO-SAMPLE-*`), **sponsored campaign** stats and **flash deals**.
- [ ] **Demo users** `*@marqova.dev` and `sample.reviewer*@marqova.dev`. Remove them, especially `admin@marqova.dev` with its public password.
- [ ] **Coupons** `WELCOME10`, `FREESHIP`, `SAVE500`, `NORTHLINE15`.
- [ ] **Homepage sections** (2 seeded rows).

## Media

- [ ] **Product images** are generated SVGs from `/sample/[kind].svg` with a "SAMPLE" label. Replace them with real photography (6+ angles per product).
- [ ] **3D models** link to the Khronos glTF Sample Assets (MaterialsVariantsShoe, ChronographWatch, SunglassesKhronos, BoomBox, GlamVelvetSofa, WaterBottle, ToyCar, Avocado) on raw.githubusercontent.com. Check each model's licence in that repository, or replace with your sellers' GLB/USDZ files, and drop `raw.githubusercontent.com` from the CSP `connect-src` in `next.config.ts`.
- [ ] **Logo**: the wordmark is typeset in Playfair Display. Commission a final logo and favicon set (`src/app/favicon.ico` is still the Next.js default).
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
