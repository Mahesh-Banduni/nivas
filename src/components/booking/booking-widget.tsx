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
    <div className="surface overflow-hidden shadow-[0_24px_60px_-45px_rgba(25,23,19,0.5)]">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-baseline gap-1.5">
          <span className="display text-[26px] text-ink">{formatINR(nightlyPrice)}</span>
          <span className="text-[12px] text-muted">/ night</span>
        </div>
        <p className="mt-0.5 text-[11.5px] text-muted">
          {minNights > 1 ? `${minNights}-night minimum · ` : ""}sleeps {maxGuests}
        </p>
      </div>

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-lg border border-line-strong px-3 py-2">
            <span className="block text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">Check in</span>
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
              className="mt-1 w-full border-0 bg-transparent p-0 text-[12.5px] text-ink focus:outline-none"
            />
          </label>
          <label className="rounded-lg border border-line-strong px-3 py-2">
            <span className="block text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">Check out</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || new Date().toISOString().slice(0, 10)}
              onChange={(event) => setCheckOut(event.target.value)}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[12.5px] text-ink focus:outline-none"
            />
          </label>
        </div>

        <div className="rounded-lg border border-line-strong px-3 py-2">
          <span className="block text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">Guests</span>
          <Select
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="mt-1 border-0 bg-transparent p-0 pr-6 text-[12.5px] focus:shadow-none"
          >
            {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "guest" : "guests"}
              </option>
            ))}
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setShowCalendar((value) => !value)}
          className="flex w-full items-center justify-between text-[11.5px] text-pine hover:underline"
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={13} /> {showCalendar ? "Hide calendar" : "Check availability"}
          </span>
          <Icon name={showCalendar ? "chevron-down" : "chevron-right"} size={13} />
        </button>

        {showCalendar && (
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
        )}

        {quoteError && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3 py-2 text-[11.5px] text-rose">
            <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
            {quoteError}
          </div>
        )}
        {!quoteError && nights > 0 && !meetMinimum && (
          <p className="text-[11.5px] text-clay">
            This home has a {minNights}–{maxNights} night stay window.
          </p>
        )}

        <Button onClick={reserve} disabled={!valid || !meetMinimum || pending || isOwner} className="w-full" size="lg">
          {isOwner ? "This is your listing" : pending ? "Holding dates…" : signedIn ? "Reserve" : "Sign in to reserve"}
          {!pending && !isOwner && <Icon name="arrow-right" size={15} />}
        </Button>

        {error && <p className="text-center text-[11.5px] text-rose">{error}</p>}
        <p className="text-center text-[10.5px] text-muted">
          You won&apos;t be charged yet · 15-minute hold after reserving
        </p>

        {quote && (
          <div className="space-y-2 border-t border-line pt-4 text-[12.5px]">
            <div className="flex justify-between text-muted">
              <span>
                {formatINR(quote.nightlyPrice)} × {quote.nights} {quote.nights === 1 ? "night" : "nights"}
              </span>
              <span className="text-ink">{formatINR(quote.subtotal)}</span>
            </div>
            {quote.cleaningFee > 0 && (
              <div className="flex justify-between text-muted">
                <span>Cleaning fee</span>
                <span className="text-ink">{formatINR(quote.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Service fee</span>
              <span className="text-ink">{formatINR(quote.serviceFee)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>GST on service fee</span>
              <span className="text-ink">{formatINR(quote.taxAmount)}</span>
            </div>
            <div className={cn("flex justify-between border-t border-line pt-2.5 font-medium text-ink")}>
              <span>Total</span>
              <span>{formatted}</span>
            </div>
            {loading && <p className="text-right text-[10px] text-muted">Updating quote…</p>}
          </div>
        )}
      </div>
    </div>
  );
}
