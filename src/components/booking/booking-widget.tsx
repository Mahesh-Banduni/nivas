"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/field";
import { AvailabilityCalendar } from "./availability-calendar";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";

interface Quote {
  nights: number;
  nightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxAmount: number;
  total: number;
}

export function BookingWidget({
  propertyId,
  nightlyPrice,
  maxGuests,
  minNights,
  maxNights,
  signedIn,
  isOwner,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
}: {
  propertyId: string;
  nightlyPrice: number;
  maxGuests: number;
  minNights: number;
  maxNights: number;
  signedIn: boolean;
  isOwner: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? "");
  const [guests, setGuests] = useState(initialGuests);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const nights = quote?.nights ?? 0;

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          propertyId,
          checkIn,
          checkOut,
          guests: String(guests),
        });
        const response = await fetch(`/api/quote?${params.toString()}`);
        const data = (await response.json()) as { quote?: Quote; error?: string };
        if (!active) return;
        if (!response.ok) {
          setQuote(null);
          setQuoteError(data.error ?? "Those dates are not available");
        } else {
          setQuote(data.quote ?? null);
          setQuoteError(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [propertyId, checkIn, checkOut, guests]);

  const valid = Boolean(quote && checkIn && checkOut && !quoteError);
  const meetMinimum = nights >= minNights && nights <= maxNights;

  const formatted = useMemo(() => (quote ? formatINR(quote.total) : null), [quote]);

  async function reserve() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId, checkIn, checkOut, guests }),
      });
      const data = (await response.json()) as { bookingId?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not hold those dates");
      router.push(`/checkout/${data.bookingId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not hold those dates");
      setPending(false);
    }
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_48px_-20px_rgba(26,23,19,0.18)]">
      <div className="border-b border-line/70 bg-gradient-to-b from-[#fbf8f2] to-white px-6 py-5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[28px] font-medium leading-none text-ink">{formatINR(nightlyPrice)}</span>
          <span className="text-[13px] text-muted">/ night</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {minNights > 1 ? `${minNights}-night minimum · ` : ""}sleeps up to {maxGuests}
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="overflow-hidden rounded-xl border border-line-strong bg-cream/30">
          <div className="grid grid-cols-2 divide-x divide-line-strong">
            <label className="p-3 transition-colors hover:bg-white/80">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Check-in</span>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  const value = event.target.value;
                  setCheckIn(value);
                  if (value && checkOut && checkOut <= value) {
                    const next = new Date(`${value}T00:00:00.000Z`);
                    next.setUTCDate(next.getUTCDate() + Math.max(1, minNights));
                    setCheckOut(next.toISOString().slice(0, 10));
                  }
                }}
                className="mt-1 w-full border-0 bg-transparent p-0 text-[13px] font-medium text-ink focus:outline-none"
              />
            </label>
            <label className="p-3 transition-colors hover:bg-white/80">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Check-out</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().slice(0, 10)}
                onChange={(event) => setCheckOut(event.target.value)}
                className="mt-1 w-full border-0 bg-transparent p-0 text-[13px] font-medium text-ink focus:outline-none"
              />
            </label>
          </div>
          <div className="border-t border-line-strong p-3 transition-colors hover:bg-white/80">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Guests</span>
            <Select
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className="mt-1 border-0 bg-transparent p-0 pr-6 text-[13px] font-medium text-ink focus:shadow-none"
            >
              {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "guest" : "guests"}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCalendar((value) => !value)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-pine transition-colors hover:text-gold-deep"
        >
          <Icon name="calendar" size={14} />
          <span>{showCalendar ? "Hide availability calendar" : "View calendar & availability"}</span>
          <Icon name={showCalendar ? "chevron-down" : "chevron-right"} size={13} />
        </button>

        {showCalendar && (
          <div className="animate-fade-in pt-1">
            <AvailabilityCalendar
              propertyId={propertyId}
              checkIn={checkIn}
              checkOut={checkOut}
              minNights={minNights}
              onChange={(nextIn, nextOut) => {
                setCheckIn(nextIn);
                setCheckOut(nextOut);
              }}
            />
          </div>
        )}

        {quoteError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose/30 bg-rose-soft/80 p-3 text-[12px] text-rose">
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}
        {!quoteError && nights > 0 && !meetMinimum && (
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[12px] text-amber-800">
            This stay requires a {minNights}–{maxNights} night window.
          </p>
        )}

        <Button
          onClick={reserve}
          disabled={!valid || !meetMinimum || pending || isOwner}
          className="w-full shadow-gold"
          size="lg"
        >
          {isOwner ? "This is your listing" : pending ? "Holding dates…" : signedIn ? "Reserve this stay" : "Sign in to reserve"}
          {!pending && !isOwner && <Icon name="arrow-right" size={15} />}
        </Button>

        {error && <p className="text-center text-[12px] text-rose">{error}</p>}
        <p className="text-center text-[11px] text-muted">
          No charge right now · 15-minute lock on reserved dates
        </p>

        {quote && (
          <div className="space-y-2.5 border-t border-line/70 pt-4 text-[13px]">
            <div className="flex justify-between text-ink-soft">
              <span>
                {formatINR(quote.nightlyPrice)} × {quote.nights} {quote.nights === 1 ? "night" : "nights"}
              </span>
              <span className="font-medium text-ink">{formatINR(quote.subtotal)}</span>
            </div>
            {quote.cleaningFee > 0 && (
              <div className="flex justify-between text-ink-soft">
                <span>Cleaning fee</span>
                <span className="font-medium text-ink">{formatINR(quote.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-soft">
              <span>Service fee</span>
              <span className="font-medium text-ink">{formatINR(quote.serviceFee)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>GST on service fee</span>
              <span className="font-medium text-ink">{formatINR(quote.taxAmount)}</span>
            </div>
            <div className={cn("flex justify-between border-t border-line/70 pt-3 text-[14px] font-semibold text-ink")}>
              <span>Total before taxes</span>
              <span className="font-display text-[16px] text-gold-deep">{formatted}</span>
            </div>
            {loading && <p className="text-right text-[10.5px] text-muted animate-pulse">Recalculating quote…</p>}
          </div>
        )}
      </div>
    </div>
  );
}
