You are a senior full-stack team building **Marqova**, a premium multi-vendor e-commerce marketplace for EVERY niche (fashion, electronics, home, beauty, sports, kids, grocery, auto, books, handmade, pets, wholesale and any future category).
Tagline: **"Marqova — See it. Trust it. Own it."**

Marqova must match Amazon's product-page depth and Seller Central's listing management, and beat Amazon, eBay and Walmart on trust, clarity and visual shopping (3D view + virtual try-on).

Build the complete project in the current directory. Work in phases, verify each phase (lint, type-check, build, tests) before moving on, and keep going until everything runs with zero errors. Do not ask me questions unless something is truly blocking; make sensible decisions and note them in `DECISIONS.md`.

---

## 1. Tech stack

- **Next.js** (latest stable, App Router) + **TypeScript** (strict) + **Tailwind CSS** + **shadcn/ui** + lucide-react icons
- **PostgreSQL** + **Prisma** ORM; **Auth.js** (email/password + Google) with roles: `SHOPPER`, `SELLER`, `ADMIN`
- **Meilisearch** for fast search with filters and typo tolerance (adapter interface so OpenSearch can replace it later)
- **Zod** + React Hook Form for every form and API input
- File uploads through an S3-compatible storage adapter (local disk fallback in development); automatic image resizing with `sharp`
- **3D:** Google `<model-viewer>` (GLB/USDZ, AR on phones) and React Three Fiber for the Try-On Studio
- **Payments:** a `PaymentProvider` interface with a Stripe adapter, a Cash on Delivery adapter, and a mock adapter for development (local wallets such as JazzCash/Easypaisa can be added later as adapters)
- **Try-on:** a `TryOnProvider` interface with a mock provider (returns a composited preview) so a real AI virtual try-on API can be plugged in via env vars
- **AI:** an `AIProvider` interface (LLM via env var) for listing generation, review summaries, natural-language search and the shopping assistant; mock provider when no key is set
- `docker-compose.yml` for PostgreSQL + Meilisearch; `.env.example` with every variable
- Vitest for unit tests, Playwright for key end-to-end flows

## 2. Brand and design system (follow exactly)

Classic, premium, calm. Lots of white space, one gold action per area, no flashing banners.

| Token | Hex | Use |
|---|---|---|
| navy-900 "Midnight Navy" | #0E1A2B | Header, footer, hero panels, Buy Now button |
| navy-700 "Deep Navy" | #1C2A40 | Category bar, dark cards |
| gold-500 "Heritage Gold" | #C8A24A | Add to Cart, search button, highlights, logo "o" |
| gold-600 "Deep Gold" | #A8842F | Hover, rating stars |
| gold-text | #7A5E1C | Gold-toned links/text on light backgrounds (passes contrast) |
| ivory | #FAF8F3 | Page background |
| white | #FFFFFF | Cards, panels |
| ink | #1A2333 | Body text, prices |
| slate | #5B6575 | Secondary text |
| sand | #E6E1D6 | Borders, dividers |
| emerald | #1F7A5A | In stock, Trust Score, free delivery |
| crimson | #B3261E | Discounts, price drops, errors |

- Fonts: **Playfair Display** (logo, page headings) + **Inter** (all UI, body, prices). Load with `next/font`.
- Logo: wordmark "Marqova" in Playfair Display, navy (white on dark), with the "o" in Heritage Gold.
- Buttons: Add to Cart = gold background + navy text; Buy Now = navy background + white text; secondary = white with sand border. Radius 8px, min height 44px.
- Put all tokens in `tailwind.config` and CSS variables. Support dark mode for the Try-On Studio (navy background) only; the store is light.
- WCAG AA contrast, keyboard navigation, visible focus rings, real buttons/links/labels, alt text everywhere.

## 3. Shopper experience

1. **Header (every page):** logo; "Deliver to" location; search bar with category dropdown, autocomplete and search-by-photo button; Account, Returns & Orders, Cart with count. Second bar: All (mega-menu of every category), Today's Deals, top categories, **Try-On Studio** (gold), Sell on Marqova.
2. **Home:** hero ("See it. Trust it. Own it." + Start shopping + Try clothes on in 3D), trust strip (Verified sellers, Real reviews only, Full price upfront, Easy returns), category grid for every niche, deals carousel, recommended for you, recently viewed, seller call-to-action band, footer.
3. **Search and category pages:** facet filters generated from each category's attributes (price, brand, rating, Trust Score, delivery speed, size, color, plus category-specific ones), sort options, grid/list toggle, "3D / Try-on available" filter, pagination or infinite scroll, sponsored results clearly labelled and capped at 2 per page.
4. **Product page (Amazon-level depth, cleaner):**
   - Gallery with thumbnails, zoom, video, **View in 3D** (model-viewer, AR on mobile) and **Try it on me** buttons for clothing/shoes/accessories
   - Brand/store link, title, rating + verified-review count, Trust Score badge
   - Price, old price, % off, **price history mini-chart** + "Set a price alert"
   - Variant pickers (color swatches, size pills) with per-variant stock and price; "Recommended size for you"
   - About this item bullets, full description, specs table, size guide
   - **Buy box:** price, delivery date for the shopper's location, full total with no hidden fees, stock status, quantity, Add to Cart, Buy Now, secure payment note, seller card (verified badge, response time, return policy), "other sellers from Rs X", wishlist, compare, share
   - Frequently bought together, similar items
   - Q&A (ask/answer, upvotes)
   - Reviews: verified buyers only, AI summary + topic chips, filter by stars/photos/fit, reviewer's height and size bought for clothing
5. **Try-On Studio:** avatar type Men / Women / Kids, height and weight sliders, body shape (Slim, Athletic, Regular, Broad), rotate/360° spin/AR, fit map legend (good fit / slightly loose / tight), fit advice text, "add to the look" (combine garments), option to upload own photo (consent checkbox, private, deletable), Add size to Cart, save avatar to account.
6. **Cart and checkout:** guest checkout, saved addresses, delivery options with dates, coupon codes, payment step (card, cash on delivery, wallets via adapters), order review with full price breakdown, confirmation page and email.
7. **Account:** orders with tracking, returns/refunds, wishlist, price alerts, saved sizes/avatars, addresses, reviews, messages with sellers.
8. **AI Shopping Assistant:** floating chat to search in plain language, compare products, check fit and track orders (uses the AIProvider; mock answers in development).

## 4. Seller Hub (Seller Central equivalent, unlimited listings)

- Seller signup and verification flow (ID, business details, bank account, approval by admin); seller tiers Individual / Business / Brand
- **Listings:** unlimited products and variants; table with search, status tabs (All, Active, Out of stock, Drafts, Needs attention), bulk select/edit/activate/deactivate, columns for price, stock, listing quality score, 3D/try-on status
- **Add product wizard:** choose category → category-specific attribute template → variants matrix (e.g. color × size) → images/video/3D model upload → pricing and stock per variant → shipping → preview → publish
- **List from a photo (AI):** upload photos → AI drafts title, bullets, description, category, attributes and tags → seller reviews and edits
- **Bulk upload:** downloadable CSV/Excel template per category, upload with row-level validation report, background job processing, partial success handling
- Inventory (multi-warehouse, low-stock alerts), Orders (accept, pack, print shipping label, mark shipped), Returns, Customer messages
- Promotions: coupons, flash deals, sponsored listings (cost-per-click budget)
- Analytics: views, conversion rate, sales, top products, traffic sources (charts)
- Payouts: balance, fee breakdown, payout history, transparent fee calculator
- Seller API (REST, API keys) for listing and inventory sync

## 5. Admin panel

Approve/reject sellers, moderate listings and reviews (with AI flags for counterfeits and fake reviews), manage categories and their attribute templates (so ANY new niche can be added without code), commissions per category, disputes and refunds, banners/homepage sections, users, reports.

## 6. Trust features (our edge)

- **Trust Score** (0–100) for sellers and products, calculated from delivery on time, return rate, cancellation rate, verified review rating and response time; show the breakdown on hover
- Only buyers with a delivered order can review; detect review bursts and duplicate text
- Price shown on cards and product pages always includes delivery estimate; no hidden fees at checkout
- Buyer protection and clear return policy on every product

## 7. Data model (Prisma) — at minimum

User, Address, SellerProfile, Verification, Store, Category (tree), AttributeDefinition (per category), Product, ProductVariant, ProductMedia (image/video/3D), Inventory, Warehouse, PriceHistory, Cart, CartItem, Order, OrderItem, Shipment, Payment, Return, Review, ReviewMedia, Question, Answer, Wishlist, PriceAlert, Coupon, Promotion, SponsoredCampaign, Payout, FeeRule, TrustScore, AvatarProfile (consented body measurements), Notification, AuditLog. Use proper indexes for search and listing tables that may hold millions of rows; paginate with cursors.

## 8. Quality bar

- Mobile-first and fully responsive (320px to 4K); sticky Add to Cart / Buy Now bar on mobile product pages
- Lighthouse: Performance 90+, Accessibility 95+, SEO 100 on home, category and product pages
- SEO: server rendering, per-page metadata, Open Graph, JSON-LD (Product, Offer, AggregateRating, BreadcrumbList, Organization), sitemap.xml, robots.txt, clean URLs (`/p/[slug]`, `/c/[category]`, `/store/[slug]`)
- Security: hashed passwords, CSRF protection, rate limiting on auth and search, role checks on every API route, input validation with Zod, secrets only in env vars, never store card numbers, security headers
- Privacy: avatar measurements and try-on photos require consent, are private to the user and deletable
- Performance: image optimization, caching, lazy loading, database indexes, background jobs for bulk uploads and emails

## 9. Honesty rules

- Seed the database with clearly labelled SAMPLE data across at least 12 categories (e.g. store names like "Sample Store — Northline"), not real brands, real logos or real reviews.
- Never present sample reviews, ratings or statistics as real; mark them in the seed file and list everything to replace in `CONTENT_TODO.md`.
- Legal pages (terms, privacy, seller agreement, return policy) are templates marked "review with a lawyer before launch".

## 10. Build order

1. Setup: project, tooling, design tokens, layout, header/footer, docker-compose, Prisma schema, seed
2. Catalog: categories + attribute templates, product pages, search and filters
3. Cart, checkout, orders, payments (mock + COD + Stripe adapters)
4. Seller Hub: onboarding, listings table, add product wizard, bulk upload, inventory, orders
5. Reviews, Q&A, Trust Score, price history and alerts
6. 3D viewer + Try-On Studio (mock provider) + AI features (mock provider)
7. Admin panel
8. Tests, accessibility pass, Lighthouse pass, README

## 11. Delivery

- `README.md`: overview, architecture, setup (`docker compose up -d`, `npm install`, `npx prisma migrate dev`, `npm run seed`, `npm run dev`), env variables, how to add a new category/niche, how to plug in real payment/try-on/AI providers, how to deploy
- Demo logins for shopper, seller and admin in the README (development only)
- Run lint, type-check, tests and `npm run build`; fix every error before finishing
- Finish with a short summary: what was built, what uses mock providers, what must be replaced before launch, and the exact commands to run it

Start now with step 1 and continue through every step.
