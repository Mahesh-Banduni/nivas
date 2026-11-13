import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArtImage } from "@/components/property/art-image";
import { PaymentPanel } from "@/components/checkout/payment-panel";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatDateRange } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { isDemoPayments } from "@/infrastructure/payments/razorpay";
import { requireUser } from "@/modules/auth/session";
import { getCheckoutContext } from "@/modules/payments/payment.service";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/checkout/${id}`);
  const booking = await getCheckoutContext(user.id, id);
  if (!booking) notFound();
  if (booking.status === "booked") redirect(`/bookings/${booking.id}?paid=1`);
  if (!["held", "booked"].includes(booking.status)) {
    return (
      <div className="container-page py-20 text-center">
        <Icon name="clock" size={28} className="mx-auto text-muted" />
        <h1 className="display mt-4 text-[32px] text-ink">This hold has expired</h1>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
          The dates were released back to the calendar because checkout was not completed in time.
          Nothing has been charged — start a new reservation to try again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/properties/${booking.property_slug}`} className="btn btn-primary">
            Pick dates again
          </Link>
          <Link href="/search" className="btn btn-outline">Browse stays</Link>
        </div>
      </div>
    );
  }

  const lines = [
    ["Nightly subtotal", booking.subtotal],
    ["Cleaning fee", booking.cleaning_fee],
    ["Service fee", booking.service_fee],
    ["GST on service fee", booking.tax_amount],
  ] as const;

  return (
    <div className="container-page py-9 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Secure checkout</p>
          <h1 className="display mt-2 text-[34px] leading-tight text-ink sm:text-[40px]">Confirm your stay</h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            Booking {booking.code} · {formatDateRange(booking.check_in, booking.check_out)}
          </p>
        </div>
        <CancelBookingButton bookingId={booking.id} label="Release hold" variant="ghost" redirectTo={`/properties/${booking.property_slug}`} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="surface overflow-hidden">
            <div className="flex gap-4 p-4">
              <div className="h-28 w-36 shrink-0 overflow-hidden rounded-lg bg-sand">
                <ArtImage
                  mediaKey={booking.cover_key}
                  url={booking.cover_url}
                  type={booking.property_type}
                  alt={booking.property_title}
                  className="h-full w-full"
                />
              </div>
              <div className="min-w-0">
                <Badge tone="pine" dot>Dates held</Badge>
                <h2 className="mt-2 truncate font-display text-[22px] text-ink">{booking.property_title}</h2>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                  <Icon name="pin" size={12} /> {booking.property_city}, {booking.property_state}
                </p>
                <Link
                  href={`/properties/${booking.property_slug}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-pine hover:underline"
                >
                  View listing <Icon name="arrow-up-right" size={12} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line px-4 py-3.5 text-[12px] sm:grid-cols-4">
              {[
                ["Check-in", formatDate(booking.check_in, "short")],
                ["Check-out", formatDate(booking.check_out, "short")],
                ["Nights", String(booking.nights)],
                ["Guests", String(booking.guests)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                  <p className="mt-0.5 font-medium text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-[19px] text-ink">Guest details</h2>
            <dl className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted">Name</dt>
                <dd className="mt-0.5 text-ink">{booking.guest_name}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.1em] text-muted">Email</dt>
                <dd className="mt-0.5 break-all text-ink">{booking.guest_email}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
              The host receives your name and booking details. Your contact number is only shared
              after confirmation, and only with the host of this stay.
            </p>
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-[19px] text-ink">Before you pay</h2>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-soft">
              {[
                "The total below is final — nightly rate, cleaning, service fee and GST.",
                "Your dates are held until the timer in the summary runs out.",
                "Cancellation terms are set by the host and shown on the listing.",
                "A confirmation email and in-app notification follow immediately after payment.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <Icon name="check" size={14} className="mt-0.5 shrink-0 text-pine" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside>
          <div className="surface sticky top-24 overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-[19px] text-ink">Price breakdown</h2>
            </div>
            <div className="space-y-2.5 p-5 text-[12.5px]">
              {lines.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-muted">
                  <span>{label}</span>
                  <span className="text-ink">{formatINR(value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-3 text-[14px] font-medium text-ink">
                <span>Total</span>
                <span>{formatINR(booking.total_amount)}</span>
              </div>
              <p className="text-[10.5px] text-muted">
                {formatINR(booking.nightly_price)} × {booking.nights} nights
              </p>

              <div className="pt-3">
                <PaymentPanel
                  bookingId={booking.id}
                  total={booking.total_amount}
                  expiresAt={booking.hold_expires_at}
                  demo={isDemoPayments()}
                  guestName={booking.guest_name}
                  guestEmail={booking.guest_email}
                  propertyTitle={booking.property_title}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
