"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const today = new Date().toISOString().slice(0, 10);

function plusDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function SearchBar({
  cities = [],
  defaults,
  className,
  size = "lg",
}: {
  cities?: string[];
  defaults?: { city?: string; checkIn?: string; checkOut?: string; guests?: number };
  className?: string;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [city, setCity] = useState(defaults?.city ?? "");
  const [checkIn, setCheckIn] = useState(defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults?.checkOut ?? "");
  const [guests, setGuests] = useState(String(defaults?.guests ?? 2));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (Number(guests) > 1) params.set("guests", guests);
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`);
  }

  const cell = size === "sm" ? "px-3 py-2.5" : "px-5 py-4";
  const labelClass =
    "block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted mb-1.5";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_8px_32px_-8px_rgba(26,23,19,0.18)] md:flex-row md:items-stretch",
        className,
      )}
    >
      {/* Where */}
      <div
        className={cn(
          "flex-1 border-b border-line/60 md:border-b-0 md:border-r md:border-line/60",
          cell,
        )}
      >
        <label className={labelClass} htmlFor="search-city">
          Where
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-0.5 pointer-events-none">
            <Icon name="pin" size={16} className="text-gold" />
          </div>
          <input
            id="search-city"
            list="nivas-cities"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Search by city"
            className="w-full pl-6 pr-4 bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
            autoComplete="off"
          />
          <datalist id="nivas-cities">
            {cities.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Check in */}
      <div
        className={cn(
          "border-b border-line/60 md:w-[160px] md:border-b-0 md:border-r md:border-line/60",
          cell,
        )}
      >
        <label className={labelClass} htmlFor="search-checkin">
          Check in
        </label>
        <input
          id="search-checkin"
          type="date"
          min={today}
          value={checkIn}
          onChange={(event) => {
            const value = event.target.value;
            setCheckIn(value);
            if (value && (!checkOut || checkOut <= value)) setCheckOut(plusDays(value, 3));
          }}
          className="w-full border-0 bg-transparent p-0 text-[14px] text-ink focus:outline-none"
        />
      </div>

      {/* Check out */}
      <div
        className={cn(
          "border-b border-line/60 md:w-[160px] md:border-b-0 md:border-r md:border-line/60",
          cell,
        )}
      >
        <label className={labelClass} htmlFor="search-checkout">
          Check out
        </label>
        <input
          id="search-checkout"
          type="date"
          min={checkIn ? plusDays(checkIn, 1) : plusDays(today, 1)}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-[14px] text-ink focus:outline-none"
        />
      </div>

      {/* Guests */}
      <div className={cn("md:w-[140px]", cell)}>
        <label className={labelClass} htmlFor="search-guests">
          Guests
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-0.5 pointer-events-none">
            <Icon name="guests" size={16} className="text-gold" />
          </div>
          <select
            id="search-guests"
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            className="w-full pl-6 pr-6 bg-transparent text-[14px] text-ink focus:outline-none appearance-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            size={14}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
        </div>
      </div>

      {/* Search button */}
      <div className={cn("flex items-stretch p-2", size === "sm" && "pt-0")}>
        <Button
          type="submit"
          variant="primary"
          size={size === "sm" ? "md" : "lg"}
          fullWidth
          className="md:w-auto md:px-7 md:min-w-[140px] h-full"
        >
          <Icon name="search" size={16} />
          <span>Search</span>
        </Button>
      </div>
    </form>
  );
}
