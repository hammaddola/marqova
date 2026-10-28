# Launch plan — from demo to a real, trusted marketplace

The goal: a shopper landing on Marqova for the first time believes it within 10 seconds, and has a reason to buy here instead of Daraz or Instagram stores. This file sequences that work; item IDs refer to [PRIORITY_QUEUE.md](PRIORITY_QUEUE.md).

## What makes Marqova different (lead with these everywhere)

| Promise | Shopper sees | Built on |
|---|---|---|
| **Fits or free return** | "Fit confidence: 92% — size M" on every clothing page, plus a free size exchange | fit engine, try-on studio |
| **Honest prices** | A "Fair price" badge backed by 90-day price history; fake "was" prices are blocked | price history, pricing rules |
| **Sellers you can check** | A public Trust Score broken down into on-time delivery, return rate, response time and verified ID | trust score |
| **Real reviews only** | Only buyers with a delivered order can review, labelled "Verified purchase" | review guard |
| **COD with open-parcel check** | Open the parcel before paying the rider | courier integration (P0-4) |

## Phase 0 — safe to share publicly (now)

- [x] Deployed on Vercel + Supabase with verified TLS to the database
- [x] Seeded account passwords rotated away from the published default
- [ ] File uploads → Supabase Storage (S3 API); local disk is read-only on Vercel
- [ ] Shared rate limits (Upstash Redis, P0-6)
- [ ] Error monitoring (P0-8), daily database backups (P0-9)
- [ ] Custom domain + business email (e.g. support@yourdomain.pk)

## Phase 1 — real content, nothing blank

Content Claude can write and ship (no owner input needed):
- About, How it works, Help centre (shipping, returns, payments, sizing, COD), Seller guide and fee page, Contact page
- Every empty state, error message, email template and SEO description in a single consistent voice
- Product copy and specs for every listing; licensed photography (with credits) in place of generated artwork

Must come from the owner (never invented):
- Registered business name, address, phone, NTN/SECP number shown in the footer and on invoices
- Real sellers and their real stock, photos and prices; even 5–10 local sellers is a credible launch
- Legal pages reviewed by a lawyer (P0-2)

Never faked: customer reviews, ratings, sales counts, "X people viewing" or seller badges. A new store launches with **"New seller · 0 reviews"**, and that honesty is part of the brand.

## Phase 2 — trust you can see

- Trust bar under the header: COD · 7-day returns · Verified sellers · Secure checkout
- Product page: Trust Score card, delivery date estimate with the courier name, returns summary next to the Add-to-cart button
- Checkout: payment security note, order total breakdown with no surprise fees, WhatsApp order updates opt-in
- Order tracking page with courier events (P0-4)
- Email verification and password reset (P0-5)

## Phase 3 — payments and operations for Pakistan

- Payments: Safepay or PayFast (cards), JazzCash and Easypaisa wallets, COD. Stripe does not onboard Pakistan-registered businesses, so it is not the primary rail.
- Courier: TCS / Leopards / PostEx / Trax for labels, tracking and COD remittance
- Real email (Resend or SES) and WhatsApp Business notifications
- Real AI listing assistant (Anthropic API key) and a real try-on provider (P2-1)

## Phase 4 — polish and speed

- Lighthouse 90+ on mobile (P0-7)
- Urdu + RTL (P2-4), PWA install and price-drop alerts (P2-5)

## Owner checklist

| Needed from you | Unlocks |
|---|---|
| Business name, address, phone, NTN | Footer, invoices, legal pages, trust |
| Domain name | Branded URL, business email |
| Supabase Storage S3 keys | Sellers can upload real photos |
| Safepay/PayFast, JazzCash, Easypaisa merchant accounts | Real online payments |
| Courier account (PostEx/Leopards/TCS) | Tracking, COD remittance |
| First 5–10 sellers | A real catalog |
| Anthropic API key (optional) | Real AI listing and shopping assistant |
