"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, calendarGrid, monthName, todayISO } from "@/lib/date";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type NightState = "booked" | "held" | "blocked";

export function AvailabilityCalendar({
  propertyId,
  checkIn,
  checkOut,
  minNights = 1,
  onChange,
}: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  minNights?: number;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const today = todayISO();
  const [offset, setOffset] = useState(0);
  const [unavailable, setUnavailable] = useState<Record<string, NightState>>({});
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const from = today;
    const to = addDays(today, 210);
    fetch(`/api/properties/${propertyId}/availability?from=${from}&to=${to}`)
      .then((response) => response.json())
      .then((data: { calendar?: Record<string, NightState> }) => {
        if (active) setUnavailable(data.calendar ?? {});
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [propertyId, today]);

  const months = useMemo(() => {
    const base = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
    return [0, 1].map((increment) => {
      const date = new Date(base);
      date.setUTCMonth(date.getUTCMonth() + offset + increment);
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }, [offset, today]);

  function pick(date: string) {
    setNote(null);
    if (date < today) return;
    if (unavailable[date]) return;

    if (!checkIn || (checkIn && checkOut)) {
      onChange(date, "");
      return;
    }
    if (date <= checkIn) {
      onChange(date, "");
      return;
    }
    const expected = Math.max(minNights, 1);
    let nights = 0;
    let cursor = checkIn;
    while (cursor < date) {
      if (unavailable[cursor]) {
        onChange(date, "");
        setNote("Those dates overlap an existing booking. Start again from the new date.");
        return;
      }
      cursor = addDays(cursor, 1);
      nights += 1;
    }
    if (nights < expected) {
      setNote(`Minimum stay is ${expected} ${expected === 1 ? "night" : "nights"}.`);
      onChange(checkIn, addDays(checkIn, expected));
      return;
    }
    onChange(checkIn, date);
  }

  return (
    <div className="rounded-xl border border-line bg-cream/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((value) => Math.max(0, value - 2))}
          disabled={offset === 0}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-sand disabled:opacity-30"
          aria-label="Previous months"
        >
          <Icon name="chevron-left" size={14} />
        </button>
        <div className="flex gap-1.5 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-pine/30" /> free</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-clay" /> booked</span>
        </div>
        <button
          type="button"
          onClick={() => setOffset((value) => Math.min(4, value + 2))}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-sand"
          aria-label="Next months"
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {months.map(({ year, month }) => (
          <div key={`${year}-${month}`}>
            <p className="mb-1.5 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-soft">
              {monthName(month)} {year}
            </p>
            <div className="grid grid-cols-7 gap-px text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className="pb-1 text-[8.5px] uppercase text-muted/70">
                  {day}
                </span>
              ))}
              {calendarGrid(year, month).flatMap((week) =>
                week.days.map((day) => {
                  const blocked = Boolean(unavailable[day.date]);
                  const selected =
                    day.date === checkIn ||
                    day.date === checkOut ||
                    (checkIn && checkOut && day.date > checkIn && day.date < checkOut);
                  const past = day.date < today;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={blocked || past}
                      onClick={() => pick(day.date)}
                      className={cn(
                        "flex h-6 items-center justify-center rounded text-[10px] transition",
                        !day.inMonth && "opacity-25",
                        past && "cursor-not-allowed text-muted/40",
                        blocked && !past && "cursor-not-allowed bg-clay-soft text-clay/50 line-through",
                        !blocked && !past && !selected && "text-ink hover:bg-sand",
                        selected && "bg-pine text-cream",
                        day.date === checkIn && "rounded-l",
                        day.date === checkOut && "rounded-r",
                      )}
                    >
                      {Number(day.date.slice(8))}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>

      {note && <p className="mt-2 text-[10.5px] text-clay">{note}</p>}
      {checkIn && !checkOut && (
        <p className="mt-2 text-[10.5px] text-pine">Check-in {checkIn} · now choose a check-out date.</p>
      )}
    </div>
  );
}
