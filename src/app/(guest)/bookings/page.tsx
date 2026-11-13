import type { Metadata } from "next";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/stat";
import { formatDateRange, todayISO } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { requireUser } from "@/modules/auth/session";
import { listMyBookings } from "@/modules/bookings/booking.service";

export const metadata: Metadata = { title: "My trips" };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; paid?: string }>;
}) {
  const user = await requireUser("/bookings");
  const params = await searchParams;
  const bookings = await listMyBookings(user.id);
  const today = todayISO();

  const upcoming = bookings.filter(
    (booking) =>
      ["held", "booked"].includes(booking.status) && booking.check_out >= today,
  );
  const past = bookings.filter(
    (booking) =>
      !["held", "booked"].includes(booking.status) || booking.check_out < today,
  );
  const tab = params.tab === "past" ? "past" : "upcoming";
  const list = tab === "past" ? past : upcoming;

  return (
    <div className="container-page py-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Guest workspace</p>
          <h1 className="display mt-2 text-[36px] leading-tight text-ink sm:text-[42px]">My trips</h1>
          <p className="mt-2 text-[13px] text-muted">
            {upcoming.length} upcoming · {past.length} in your history
          </p>
        </div>
        <ButtonLink href="/search" variant="outline">
          <Icon name="search" size={15} /> Find another stay
        </ButtonLink>
      </div>

      {params.paid === "1" && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-pine/20 bg-pine-soft px-4 py-3 text-[12.5px] text-pine">
          <Icon name="check" size={16} className="mt-0.5" />
          Payment received. Your booking is confirmed and the host has been notified.
        </div>
      )}

      <div className="mt-7 flex gap-1 border-b border-line">
        {[
          { id: "upcoming", label: `Upcoming (${upcoming.length})` },
          { id: "past", label: `Past & cancelled (${past.length})` },
        ].map((item) => (
          <Link
            key={item.id}
            href={`/bookings?tab=${item.id}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[12.5px] transition ${
              tab === item.id
                ? "border-pine font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {list.length ? (
        <div className="mt-6 space-y-3">
          {list.map((booking) => {
            const canPay = booking.status === "held" && booking.payment_status !== "paid";
            return (
              <article
                key={booking.id}
                className="surface flex flex-col gap-4 p-4 transition hover:border-line-strong sm:flex-row sm:items-center"
              >
                <Link
                  href={`/bookings/${booking.id}`}
                  className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-sand sm:h-24 sm:w-32"
                >
                  <ArtImage
                    mediaKey={booking.cover_key}
                    url={booking.cover_url}
                    type={booking.property_type}
                    alt={booking.property_title}
                    className="h-full w-full"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <span className="text-[10.5px] text-muted">Booking {booking.code}</span>
                    {booking.payment_status === "paid" && <StatusBadge status="paid" dot={false} />}
                  </div>
                  <Link href={`/bookings/${booking.id}`} className="mt-1.5 block truncate font-display text-[20px] text-ink hover:text-pine">
                    {booking.property_title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                    <span className="inline-flex items-center gap-1"><Icon name="pin" size={11} /> {booking.property_city}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="calendar" size={11} /> {formatDateRange(booking.check_in, booking.check_out)}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="guests" size={11} /> {booking.guests} guests</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:border-0 sm:pt-0">
                  <div className="text-right">
                    <p className="text-[14px] font-medium text-ink">{formatINR(booking.total_amount)}</p>
                    <p className="text-[10.5px] text-muted">{booking.nights} nights</p>
                  </div>
                  {canPay ? (
                    <ButtonLink href={`/checkout/${booking.id}`} size="sm">
                      Complete payment
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/bookings/${booking.id}`} size="sm" variant="outline">
                      View
                    </ButtonLink>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          icon="calendar"
          title={tab === "past" ? "No trips in your history yet" : "No upcoming trips"}
          description={
            tab === "past"
              ? "Once you check out of a stay it will appear here, along with any cancellations."
              : "Start with a destination — we'll keep the dates and details here."
          }
          action={<ButtonLink href="/search">Explore stays</ButtonLink>}
        />
      )}
    </div>
  );
}
