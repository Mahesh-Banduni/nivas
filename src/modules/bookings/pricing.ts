import type { BookingRow } from "@/db/types";
import { nightsBetween, parseDate, todayISO } from "@/lib/date";
import { computeQuote, type Quote } from "@/lib/money";
import { badRequest, unavailable } from "@/lib/errors";
import type { PropertyRow, PropertyRulesRow } from "@/db/types";

export interface StayValidation {
  nights: number;
  quote: Quote;
}

/** Server-side stay validation + pricing. Never trust client totals. */
export function validateStay(
  property: PropertyRow,
  rules: PropertyRulesRow | null,
  checkIn: string,
  checkOut: string,
  guests: number,
): StayValidation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    throw badRequest("Choose valid check-in and check-out dates");
  }
  if (checkOut <= checkIn) {
    throw badRequest("Check-out must be after check-in");
  }
  if (checkIn < todayISO()) {
    throw badRequest("Check-in cannot be in the past");
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw badRequest("Minimum stay is one night");
  if (rules && nights < rules.min_nights) {
    throw unavailable(`${property.title} has a ${rules.min_nights}-night minimum stay`);
  }
  if (rules && nights > rules.max_nights) {
    throw unavailable(`${property.title} allows a maximum of ${rules.max_nights} nights`);
  }
  if (guests < 1 || guests > property.max_guests) {
    throw badRequest(`This home sleeps up to ${property.max_guests} guests`);
  }

  return {
    nights,
    quote: computeQuote({
      nightlyPrice: property.nightly_price,
      cleaningFee: property.cleaning_fee,
      nights,
    }),
  };
}

/**
 * Refund policy, evaluated in days before check-in.
 *   flexible — full refund until 24h before check-in
 *   moderate — full until 5 days, 50% until 2 days
 *   strict   — 50% until 7 days, nothing after
 */
export function calculateRefund(
  booking: Pick<BookingRow, "check_in" | "total_amount">,
  policy: PropertyRulesRow["cancellation_policy"],
): { amount: number; percent: number; label: string } {
  const days = Math.ceil(
    (parseDate(booking.check_in).getTime() - parseDate(todayISO()).getTime()) / 86_400_000,
  );

  const full = { amount: booking.total_amount, percent: 100, label: "Full refund" };
  const half = {
    amount: Math.round(booking.total_amount / 2),
    percent: 50,
    label: "50% refund",
  };
  const none = { amount: 0, percent: 0, label: "Non-refundable" };

  if (policy === "flexible") {
    if (days >= 1) return full;
    return none;
  }
  if (policy === "moderate") {
    if (days >= 5) return full;
    if (days >= 2) return half;
    return none;
  }
  if (days >= 7) return half;
  return none;
}

export function cancellationPolicyCopy(policy: PropertyRulesRow["cancellation_policy"]) {
  switch (policy) {
    case "flexible":
      return "Free cancellation until 24 hours before check-in.";
    case "strict":
      return "50% refund until 7 days before check-in. Non-refundable after that.";
    default:
      return "Free cancellation until 5 days before check-in, then 50% until 2 days before.";
  }
}
