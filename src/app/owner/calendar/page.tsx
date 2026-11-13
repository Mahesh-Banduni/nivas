import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Panel, StatCard } from "@/components/ui/stat";
import { addDays, addMonths, calendarGrid, monthLabel, todayISO } from "@/lib/date";
import { cn } from "@/lib/cn";
import { requireRole } from "@/modules/auth/session";
import { getOwnerCalendar } from "@/modules/owners/owner.service";
import { getOwnerListings } from "@/modules/properties/property.service";
import { blockDatesAction } from "@/app/owner/actions";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function OwnerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string }>;
}) {
  const user = await requireRole("owner", "/owner/calendar");
  const params = await searchParams;
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : currentMonth;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;

  const weeks = calendarGrid(year, monthIndex);
  const from = weeks[0].days[0].date;
  const to = addDays(from, 42);

  const [entries, listings] = await Promise.all([
    getOwnerCalendar(user.id, from, to),
    getOwnerListings(user.id),
  ]);

  const selectedProperty = listings.find((listing) => listing.id === params.property)?.id ?? "";
  const monthPrefix = month;
  const inMonth = Object.values(entries).filter((entry) => entry.date.startsWith(monthPrefix));
  const booked = inMonth.filter((entry) => entry.status === "booked").length;
  const held = inMonth.filter((entry) => entry.status === "held").length;
  const blocked = inMonth.filter((entry) => entry.status === "blocked").length;
  const totalNights = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const available = Math.max(0, totalNights * Math.max(1, listings.length) - booked - blocked);

  const link = (nextMonth: string) => {
    const query = new URLSearchParams({ month: nextMonth });
    if (selectedProperty) query.set("property", selectedProperty);
    return `/owner/calendar?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Availability calendar"
        description="Confirmed stays, live holds and maintenance blocks at a glance. Every night is backed by the booking ledger."
        actions={
          <>
            <ButtonLink href={link(addMonths(`${month}-01`, -1).slice(0, 7))} variant="outline" size="sm">
              <Icon name="arrow-left" size={13} /> Prev
            </ButtonLink>
            <ButtonLink href="/owner/calendar" variant="ghost" size="sm">Today</ButtonLink>
            <ButtonLink href={link(addMonths(`${month}-01`, 1).slice(0, 7))} variant="outline" size="sm">
              Next <Icon name="arrow-right" size={13} />
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Booked nights" value={String(booked)} icon="calendar" hint={monthLabel(month, "long")} />
        <StatCard label="Live holds" value={String(held)} icon="clock" hint="Expire automatically after 15 minutes" />
        <StatCard label="Blocked" value={String(blocked)} icon="lock" hint="Maintenance or owner stays" />
        <StatCard label="Open nights" value={String(available)} icon="sun" hint="Across published homes" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_330px]">
        <Panel
          title={monthLabel(month, "long")}
          action={
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-pine" /> Booked</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gold" /> Held</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-line-strong" /> Blocked</span>
            </div>
          }
          bodyClassName="p-4 sm:p-5"
        >
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="pb-2 text-center text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
                {day}
              </div>
            ))}
            {weeks.flatMap((week) =>
              week.days.map((day) => {
                const entry = entries[day.date];
                const isToday = day.date === today;
                const isPast = day.date < today;
                return (
                  <div
                    key={day.date}
                    title={
                      entry
                        ? `${day.date} · ${entry.status}${entry.guest ? ` · ${entry.guest}` : ""}${entry.code ? ` (${entry.code})` : ""}`
                        : day.date
                    }
                    className={cn(
                      "relative flex min-h-[64px] flex-col rounded-lg border p-1.5 transition sm:min-h-[84px]",
                      day.inMonth ? "border-line bg-cream" : "border-transparent bg-paper/40",
                      entry?.status === "booked" && "border-pine/25 bg-pine-soft",
                      entry?.status === "held" && "border-gold/30 bg-gold-soft",
                      entry?.status === "blocked" && "border-line-strong bg-[#e9e3d6]",
                      isPast && !entry && "opacity-55",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          day.inMonth ? "text-ink" : "text-muted/40",
                          isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-pine text-[10px] text-cream",
                        )}
                      >
                        {Number(day.date.slice(8, 10))}
                      </span>
                      {entry?.status === "held" && <span className="h-1.5 w-1.5 rounded-full bg-gold animate-dot" />}
                    </div>
                    {entry && day.inMonth && (
                      <div className="mt-auto min-w-0">
                        <p className={cn(
                          "truncate text-[9px] leading-tight",
                          entry.status === "booked" ? "text-pine" : entry.status === "held" ? "text-[#7d6129]" : "text-muted",
                        )}>
                          {entry.status === "blocked" ? "Blocked" : entry.guest?.split(" ")[0] ?? entry.status}
                        </p>
                        {entry.status === "booked" && entry.property && (
                          <p className="hidden truncate text-[8.5px] text-muted sm:block">{entry.property}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
          <p className="mt-3 text-[10px] text-muted">
            Calendar days are UTC. Check-out day is released for the next guest; check-in day is blocked.
          </p>
        </Panel>

        <aside className="space-y-5">
          <Panel title="Block dates" action={<Badge tone="neutral" dot={false}>owner block</Badge>}>
            <form action={blockDatesAction} className="space-y-3">
              <Field label="Listing" htmlFor="propertyId">
                <Select id="propertyId" name="propertyId" defaultValue={selectedProperty} required>
                  <option value="">Choose a home…</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="From" htmlFor="startDate">
                  <Input id="startDate" name="startDate" type="date" min={today} required />
                </Field>
                <Field label="Until" htmlFor="endDate">
                  <Input id="endDate" name="endDate" type="date" min={addDays(today, 1)} required />
                </Field>
              </div>
              <Button type="submit" className="w-full" disabled={!listings.length}>
                <Icon name="lock" size={14} /> Block these nights
              </Button>
              <p className="text-[10px] leading-relaxed text-muted">
                The end date is exclusive — a block from 12 to 15 covers the nights of 12, 13 and 14.
              </p>
            </form>
          </Panel>

          <Panel title="Coming up" action={<Link href="/owner/bookings" className="text-[11px] text-pine hover:underline">All</Link>}>
            {inMonth.filter((entry) => entry.status === "booked" && entry.date >= today).length ? (
              <div className="space-y-2.5">
                {inMonth
                  .filter((entry) => entry.status === "booked" && entry.date >= today)
                  .slice(0, 5)
                  .map((entry) => (
                    <Link
                      key={entry.date}
                      href={`/owner/bookings?focus=${entry.bookingId}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-cream/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-medium text-ink">{entry.guest}</p>
                        <p className="truncate text-[9.5px] text-muted">{entry.property}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted">{entry.date.slice(8, 10)}/{entry.date.slice(5, 7)}</span>
                    </Link>
                  ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-muted">No confirmed stays left this month.</p>
            )}
          </Panel>

          <div className="rounded-xl border border-line bg-cream p-4">
            <p className="eyebrow mb-2">Concurrency</p>
            <p className="text-[10.5px] leading-relaxed text-muted">
              Holds write to <code className="rounded bg-sand px-1">booking_nights</code> with a composite primary key,
              so two overlapping requests can never both succeed. Expired holds are swept by cron every few minutes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
