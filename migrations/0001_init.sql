-- ---------------------------------------------------------------------------
-- Nivas property marketplace — initial schema (Cloudflare D1 / SQLite)
--
-- Conventions
--   * ids              : application-generated opaque ids (usr_, prp_, bkg_, ...)
--   * timestamps       : ISO-8601 UTC strings, always written by the application
--                        (so lexical comparison is chronological)
--   * money            : integer minor units (paise). INR 2,500 => 250000
--   * stay dates       : 'YYYY-MM-DD', check-in inclusive / check-out exclusive
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  avatar_color   TEXT NOT NULL DEFAULT '#234A3D',
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL CHECK (role IN ('guest', 'owner', 'admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  user_agent   TEXT,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS owner_profiles (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name       TEXT NOT NULL,
  bio                 TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  payout_last4        TEXT,
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone         TEXT,
  profile_image TEXT,
  created_at    TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES users(id),
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT,
  property_type  TEXT NOT NULL,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'India',
  neighborhood   TEXT,
  latitude       REAL,
  longitude      REAL,
  nightly_price  INTEGER NOT NULL,
  cleaning_fee   INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'INR',
  max_guests     INTEGER NOT NULL DEFAULT 2,
  bedrooms       INTEGER NOT NULL DEFAULT 1,
  beds           INTEGER NOT NULL DEFAULT 1,
  bathrooms      INTEGER NOT NULL DEFAULT 1,
  rating_avg     REAL NOT NULL DEFAULT 0,
  rating_count   INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  featured       INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'suspended')),
  rejection_note TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties(status, city, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(status, nightly_price);

CREATE TABLE IF NOT EXISTS property_images (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  url         TEXT,
  alt         TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id, position);

CREATE TABLE IF NOT EXISTS amenities (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  icon  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id  TEXT NOT NULL REFERENCES amenities(id),
  PRIMARY KEY (property_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS property_rules (
  property_id         TEXT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  check_in_time       TEXT NOT NULL DEFAULT '14:00',
  check_out_time      TEXT NOT NULL DEFAULT '11:00',
  min_nights          INTEGER NOT NULL DEFAULT 1,
  max_nights          INTEGER NOT NULL DEFAULT 30,
  cancellation_policy TEXT NOT NULL DEFAULT 'moderate'
                      CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  house_rules         TEXT
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'owner_block',
  created_at  TEXT NOT NULL,
  CHECK (end_date > start_date)
);
CREATE INDEX IF NOT EXISTS idx_availability_property ON availability_blocks(property_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Reservations & money
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  property_id     TEXT NOT NULL REFERENCES properties(id),
  guest_id        TEXT NOT NULL REFERENCES users(id),
  check_in        TEXT NOT NULL,
  check_out       TEXT NOT NULL,
  nights          INTEGER NOT NULL,
  guests          INTEGER NOT NULL DEFAULT 1,
  nightly_price   INTEGER NOT NULL,
  subtotal        INTEGER NOT NULL,
  cleaning_fee    INTEGER NOT NULL DEFAULT 0,
  service_fee     INTEGER NOT NULL DEFAULT 0,
  tax_amount      INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held', 'booked', 'completed', 'cancelled', 'expired', 'refunded')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'partially_refunded')),
  hold_expires_at TEXT,
  cancelled_at    TEXT,
  cancellation_reason TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  CHECK (check_out > check_in)
);
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, hold_expires_at);

-- One row per occupied night. The composite primary key is the concurrency
-- control that makes double-booking impossible, even under simultaneous
-- requests: the second inserter hits a UNIQUE constraint.
CREATE TABLE IF NOT EXISTS booking_nights (
  property_id TEXT NOT NULL REFERENCES properties(id),
  stay_date   TEXT NOT NULL,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, stay_date)
);
CREATE INDEX IF NOT EXISTS idx_booking_nights_booking ON booking_nights(booking_id);

CREATE TABLE IF NOT EXISTS payments (
  id                  TEXT PRIMARY KEY,
  booking_id          TEXT NOT NULL REFERENCES bookings(id),
  provider            TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id   TEXT,
  provider_payment_id TEXT,
  amount              INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created', 'pending', 'paid', 'failed', 'expired', 'refunded')),
  method              TEXT,
  failure_reason      TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_order
  ON payments(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

CREATE TABLE IF NOT EXISTS refunds (
  id                 TEXT PRIMARY KEY,
  payment_id         TEXT NOT NULL REFERENCES payments(id),
  booking_id         TEXT NOT NULL REFERENCES bookings(id),
  amount             INTEGER NOT NULL,
  reason             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider_refund_id TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  payload           TEXT,
  processed_at      TEXT,
  created_at        TEXT NOT NULL,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS commissions (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  platform_fee INTEGER NOT NULL,
  owner_amount INTEGER NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'INR',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES users(id),
  amount       INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'INR',
  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'scheduled', 'paid', 'failed')),
  reference    TEXT,
  created_at   TEXT NOT NULL,
  paid_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_payouts_owner ON payouts(owner_id, created_at);

-- ---------------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id                   TEXT PRIMARY KEY,
  booking_id           TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  property_id          TEXT REFERENCES properties(id) ON DELETE SET NULL,
  subject              TEXT,
  last_message_at      TEXT,
  last_message_preview TEXT,
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at    TEXT,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  channel    TEXT NOT NULL DEFAULT 'in_app',
  status     TEXT NOT NULL DEFAULT 'queued'
             CHECK (status IN ('queued', 'sent', 'failed', 'read')),
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

-- Transactional outbox: written in the same D1 batch as the business change,
-- then drained to Cloudflare Queues by the scheduler.
CREATE TABLE IF NOT EXISTS outbox_events (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id   TEXT NOT NULL,
  payload        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'published', 'failed')),
  attempts       INTEGER NOT NULL DEFAULT 0,
  available_at   TEXT NOT NULL,
  published_at   TEXT,
  last_error     TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, available_at);

-- ---------------------------------------------------------------------------
-- Reviews, wishlists, admin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id  TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  guest_id    TEXT NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness INTEGER,
  accuracy    INTEGER,
  communication INTEGER,
  location    INTEGER,
  value       INTEGER,
  comment     TEXT,
  status      TEXT NOT NULL DEFAULT 'published'
              CHECK (status IN ('published', 'hidden')),
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id, created_at);

CREATE TABLE IF NOT EXISTS wishlists (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Saved stays',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (wishlist_id, property_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
