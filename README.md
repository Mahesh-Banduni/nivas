# Nivas — multi-vendor property marketplace

A complete, production-shaped property marketplace: a public storefront, a guest
booking experience, a host workspace and an admin console, built as a modular
monolith on Next.js and designed for Cloudflare (D1, R2 and KV).

The UI is fully realised — no placeholder screens. Listings use bespoke inline
SVG artwork (no stock imagery) with a scene/tone system that stays crisp at every
size.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with `@theme` tokens in `src/app/globals.css` |
| Database | D1-style SQLite. Local adapter uses `node:sqlite` (zero native deps) |
| ORM | Drizzle schema mirror for typing/migrations; repositories use parameterised SQL so the same code runs on D1 |
| Media | R2 with browser-direct presigned PUT uploads (SigV4 signed in-process) |
| Cache | KV read cache for search, featured listings, destinations, amenities |
| Async | Transactional outbox table; events are consumed inline |
| Realtime | Conversation threads poll for updates |
| Payments | Razorpay orders + signed, idempotent webhooks; built-in demo provider when keys are absent |

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Requirements: Node 22.5+ (24 recommended — `node:sqlite` is used directly).

On first request the app:

1. applies every `migrations/*.sql` file (all idempotent),
2. seeds a rich demo marketplace when the database is empty.

Reset everything with:

```bash
npm run db:reset               # database + media
npm run db:reset -- --keep-media
```

### Demo accounts

All demo passwords are `password123`.

| Role | Email | Notes |
| --- | --- | --- |
| Guest | `kavya@nivas.test` | Upcoming trip, wishlist, conversations |
| Host | `arjun@nivas.test` | Several homes, reservations, payouts |
| Admin | `admin@nivas.test` | Moderation queue, users, ledger |

Additional seeded guests and hosts exist for realistic queues and review data.

---

## What to try

1. **Search → property → hold → pay.** Pick dates on a listing, create a hold,
   complete the demo payment, and land on the confirmation. The 15-minute hold
   countdown is live on the checkout page.
2. **Double-booking is impossible.** Run `npm run test:booking`:
   two overlapping holds race; exactly one succeeds because
   `booking_nights` has `PRIMARY KEY (property_id, stay_date)` and each hold is
   written as one atomic batch.
3. **Guest workspace.** `/bookings` (upcoming/past tabs, cancel, review),
   `/wishlist`, `/messages` (5s polling, read receipts), `/account`.
4. **Host workspace.** `/owner` overview, listings CRUD with browser-to-R2
   uploads, reservations with cancellation, month calendar with block dates,
   earnings and payouts.
5. **Admin console.** `/admin` health, moderation (approve / request changes /
   suspend / feature), all bookings, payment ledger, users (suspend, verify
   host), reviews (hide/publish with rating recalculation), audit + outbox.
6. **Auth edge cases.** Register as guest or host, role checks redirect with a
   `next` parameter, suspended users lose sessions immediately, login is rate
   limited.

---

## Architecture

```
src/
  app/
    (public)/          storefront: home, search, property, destinations, host CTA
    (auth)/            split-screen login + register
    (guest)/           trips, checkout, wishlist, messages, account
    owner/             host workspace (shell + server actions)
    admin/             admin console
    api/               REST handlers: auth, bookings, payments, uploads, chat,
                       wishlist, cron, Razorpay webhook
  modules/             domain modules (auth, properties, availability, bookings,
                       payments, messaging, reviews, wishlist, notifications,
                       admin, owners)
  infrastructure/
    cloudflare/        D1 adapter, KV, R2 SigV4 presigning and OpenNext bindings
    payments/          Razorpay client (order, verify, refund)
    notifications/     email + SMS providers
  components/          UI kit, property art, site chrome, dashboard shell
  db/                  database interface, local adapter, schema mirror, seed
migrations/0001_init.sql   canonical DDL (D1 migrations directory)
scripts/                   reset + concurrency test
wrangler.jsonc             Cloudflare Worker, D1, R2 and KV bindings
```

### Modular monolith

Route handlers and server actions are thin. Business rules live in module
services (`booking.service.ts`, `payment.service.ts`, …), which own
transactions and invariants. Repositories accept a `Database` so the same code is
exercised by the local adapter and D1.

### Local ↔ Cloudflare

`src/db/index.ts` boots `LocalDatabase` (node:sqlite) behind a D1-compatible
`prepare/bind/all/first/run/batch` interface. `D1Adapter` implements the same
interface in production. Everything above the adapter is portable.

---

## Data model highlights

- **Money** is integer paise everywhere; formatting happens at the edge.
- **Timestamps** are ISO-8601 UTC strings, so lexical ordering is chronological.
- **Ids** are opaque and application-generated (`usr_`, `prp_`, `bkg_`, …).
- **Stay dates** are `YYYY-MM-DD`; check-in inclusive, check-out exclusive.
- **Availability**: `booking_nights(property_id, stay_date)` PK is the source of
  truth. Confirmed bookings, live holds, owner maintenance blocks and manual
  blocks all respect it.
- **Ledger**: `payments`, `refunds`, `commissions`, `payouts`, `payment_events`.
  Commission is 15% of the nightly subtotal; guests pay an 8% service fee plus
  18% GST on that fee.
- **Outbox**: every business mutation writes its event in the same batch.
  `dispatchOutbox()` consumes pending events inline.
- **Audit**: privileged actions append immutable rows.

Numbering and fee rules live in `src/lib/money.ts` so the quote, checkout,
commission and tests cannot drift.

---

## Booking concurrency

```
BEGIN (D1 batch)
  INSERT booking (held, hold_expires_at = now + 15m)
  INSERT booking_nights (property_id, stay_date) × nights
  INSERT outbox event
COMMIT
```

The second overlapping writer violates the composite primary key and rolls the
whole batch back. Holds expire via `/api/cron/tick` (idempotent sweep), which
releases nights and marks bookings expired. Payment settlement flips the booking
to `booked`, writes commission rows, opens the conversation and emits
notifications exactly once.

---

## Payments

Set both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to create real Razorpay
orders. If either is blank, checkout uses the **demo provider**:

1. checkout creates an order (real rows in `payments`),
2. the demo button calls `/api/payments/[id]/pay`, which signs an HMAC callback
   with the same secret used in production and feeds it through
   `handleRazorpayWebhook()`,
3. signature verification, event dedupe (`payment_events` unique key) and
   `settlePayment()` run identically to a live webhook.

Refunds follow the listing policy and are recorded against the payment, never by
mutating history.

### Razorpay webhook setup

In the Razorpay Dashboard, add a webhook pointing to:

```
https://<your-domain>/api/webhooks/razorpay
```

Subscribe to `payment.captured`, `payment.authorized`, `payment.failed`,
`refund.processed`, and `order.paid`. Generate a webhook signing secret in the
Dashboard and set the exact same value as `RAZORPAY_WEBHOOK_SECRET` in the
deployment environment. For Wrangler, use
`npx wrangler secret put RAZORPAY_WEBHOOK_SECRET`. This is separate from the
Razorpay API key secret.
The handler verifies the signature against the unmodified request body, records
event IDs for idempotency, and returns a server error for processing failures so
Razorpay can retry them. Do not configure production payments without this
webhook secret.

---

## Media uploads

1. Browser asks `/api/uploads/presign` for a target,
2. server validates property ownership, MIME, size and returns a short-lived
   presigned PUT (R2 SigV4) — or a local upload token in development,
3. browser PUTs directly to R2,
4. `/api/properties/[id]/images` verifies the object (magic-byte sniffing) and
   attaches it.

The API never proxies image bytes in production. The local adapter writes to
`.data/media` and serves through `/api/media/[...key]`.

---

## Messaging

Conversation membership is re-checked on every read and write. Threads are
polled every 5 seconds in the UI and mark unread messages as read.

---

## Cloudflare deployment

Prerequisites: a Cloudflare account with Workers, R2, D1 and KV enabled.

```bash
npx wrangler d1 create nivas-prod-db
npx wrangler r2 bucket create nivas-property-media
npx wrangler kv namespace create CACHE

# Copy the returned database_id and namespace id values into wrangler.jsonc,
# and replace APP_URL with your public domain before deploying.
npx wrangler d1 migrations apply nivas-prod-db --remote
npx wrangler d1 migrations apply nivas-prod-db --local
npm run cf:preview
npm run cf:deploy
```

The remote migration prepares production D1. The separate local migration
prepares Wrangler's local D1 used by `cf:preview`; apply it again whenever new
migration files are added.

Set secrets:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Use an authenticated external scheduler to call `POST /api/cron/tick` with the
`x-cron-secret` header. The route itself is idempotent.

R2 CORS must allow `PUT` from `APP_URL` with `content-type` headers.

OpenNext reads bindings from the request's Cloudflare context. D1 is selected
instead of the local SQLite adapter when the `DB` binding is present. Local
`npm run dev` keeps the SQLite/demo database by default; set
`NIVAS_USE_CLOUDFLARE=true` to exercise Wrangler's local bindings. Queue
consumers, Durable Object chat and scheduled Worker handlers are not enabled in
this deployment configuration.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Delete local DB + media, then re-seed on next boot |
| `npm run test:booking` | Race two overlapping holds; expects exactly one winner |
| `npm run cf:build` | OpenNext Cloudflare build |
| `npm run cf:preview` | Build and preview in the Workers runtime |
| `npm run cf:deploy` | Build and deploy to Cloudflare Workers |

---

## Environment

Copy `.env.example` to `.env.local`. Everything has a safe local fallback:

- `SESSION_SECRET` — session token hashing (rotate in production)
- `RAZORPAY_*` — blank keys switch to the demo provider
- `CRON_SECRET` — protects `/api/cron/tick`
- `EMAIL_FROM`, `RESEND_API_KEY`, `SMS_API_KEY` — notification providers
- `NIVAS_DB_PATH` — optional override for the local SQLite file

---

## Design language

Warm white, champagne gold, deep pine green and restrained terracotta. Display
type is a high-contrast serif, body copy a humanist sans.
Components share tokens (`.surface`, `.btn`, `.field`, `text-ink`, `text-muted`,
`border-line`) so all three portals feel like one product. The dashboard shell
keeps host and admin navigation consistent, with mobile drawers and live status
dots.

---

## Notes & boundaries

- Payment, email and SMS providers are behind interfaces; demo mode is explicit
  and visible in the UI.
- Local development uses SQLite and filesystem storage; the Cloudflare Worker
  uses D1, R2 and KV bindings. Queues, Durable Object chat and scheduled Worker
  handlers are not enabled in the current deployment configuration.
- Listing imagery is generated SVG, so the repository contains no binary assets
  and no external image dependencies.
