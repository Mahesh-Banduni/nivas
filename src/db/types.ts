export type Role = "guest" | "owner" | "admin";
export type UserStatus = "active" | "suspended" | "deleted";
export type PropertyStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "suspended";
export type BookingStatus =
  | "held"
  | "booked"
  | "completed"
  | "cancelled"
  | "expired"
  | "refunded";
export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "refunded"
  | "partially_refunded";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  phone: string | null;
  avatar_color: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface OwnerProfileRow {
  user_id: string;
  business_name: string;
  bio: string | null;
  verification_status: "pending" | "verified" | "rejected";
  payout_last4: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

export interface PropertyRow {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  property_type: string;
  city: string;
  state: string;
  country: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  nightly_price: number;
  cleaning_fee: number;
  currency: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating_avg: number;
  rating_count: number;
  view_count: number;
  featured: number;
  status: PropertyStatus;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyImageRow {
  id: string;
  property_id: string;
  r2_key: string;
  url: string | null;
  alt: string | null;
  position: number;
  created_at: string;
}

export interface AmenityRow {
  id: string;
  name: string;
  icon: string;
}

export interface PropertyRulesRow {
  property_id: string;
  check_in_time: string;
  check_out_time: string;
  min_nights: number;
  max_nights: number;
  cancellation_policy: "flexible" | "moderate" | "strict";
  house_rules: string | null;
}

export interface BookingRow {
  id: string;
  code: string;
  property_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  nightly_price: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  hold_expires_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingNightRow {
  property_id: string;
  stay_date: string;
  booking_id: string;
}

export interface PaymentRow {
  id: string;
  booking_id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "pending" | "authorized" | "paid" | "failed" | "expired" | "refunded";
  method: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRow {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number;
  reason: string;
  status: "pending" | "processing" | "completed" | "failed";
  provider_refund_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  booking_id: string | null;
  property_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  property_id: string;
  booking_id: string;
  guest_id: string;
  rating: number;
  cleanliness: number | null;
  accuracy: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
  comment: string | null;
  status: "published" | "hidden";
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  channel: string;
  status: "queued" | "sent" | "failed" | "read";
  read_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: string | null;
  created_at: string;
}

/** A property joined with the bits the UI needs. */
export interface PropertyCardData extends PropertyRow {
  owner_name: string;
  cover_key: string | null;
  cover_url: string | null;
  amenity_names: string | null;
}

export interface PropertyDetail extends PropertyRow {
  owner_name: string;
  owner_business: string | null;
  owner_verified: string | null;
  owner_since: string | null;
  images: PropertyImageRow[];
  amenities: AmenityRow[];
  rules: PropertyRulesRow | null;
}

export interface BookingWithProperty extends BookingRow {
  property_title: string;
  property_slug: string;
  property_city: string;
  property_state: string;
  property_type: string;
  cover_key: string | null;
  cover_url: string | null;
  guest_name: string;
  guest_email: string;
  owner_id: string;
  owner_name: string;
}
