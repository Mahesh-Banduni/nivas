import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtImage } from "@/components/property/art-image";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { ReviewForm } from "@/components/booking/review-form";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getDb } from "@/db";
import { formatDate, formatDateRange, formatDateTime, todayISO } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { titleCase } from "@/lib/labels";
import { requireUser } from "@/modules/auth/session";
import { getBookingForUser, getBookingTimeline } from "@/modules/bookings/booking.service";

export const metadata: Metadata = { title: "Booking details" };

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser(`/bookings/${id}`);
  const booking = await getBookingForUser(user.id, user.roles, id);
  if (!booking) notFound();

  const db = await getDb();
  const [timeline, conversation, review, rules] = await Promise.all([
    getBookingTimeline(booking),
    db
      .prepare(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
         WHERE c.booking_id = ? LIMIT 1`,
      )
      .bind(user.id, booking.id)
      .first<{ id: string }>(),
    db
      .prepare("SELECT id, rating FROM reviews WHERE booking_id = ? AND guest_id = ?")
      .bind(booking.id, user.id)
      .first<{ id: string; rating: number }>(),
    db.prepare("SELECT * FROM property_rules WHERE property_id = ?").bind(booking.property_id).first<{
      check_in_time: string;
      check_out_time: string;
      min_nights: number;
      max_nights: number;
      cancellation_policy: string;
      house_rules: string | null;
    }>(),
  ]);

  const isGuest = booking.guest_id === user.id;
  const canReview = isGuest && !review && booking.status === "completed";
  const canCancel = ["held", "booked"].includes(booking.status);
  const priceLines = [
    ["Nightly subtotal", booking.subtotal],
    ["Cleaning fee", booking.cleaning_fee],
    ["Service fee", booking.service_fee],
    ["GST on service fee", booking.tax_amount],
  ] as const;

  const statusCopy: Record<string, { title: string; body: string }> = {
    held: {
      title: "Your dates are on hold",
      body: "Complete payment before the hold expires. Nothing has been charged yet.",
    },
    booked: {
      title: "You're confirmed",
      body: "The host has been notified. Arrival details will be shared in your message thread.",
    },
    completed: {
      title: "Stay completed",
      body: "We hope it was restful. You can leave a review below.",
    },
    cancelled: {
      title: "Booking cancelled",
      body: "The dates have been released. Any refund is tracked in your payment history.",
    },
    expired: {
      title: "Hold expired",
      body: "Checkout was not completed in time, so the dates were released. Nothing was charged.",
    },
    refunded: {
      title: "Booking refunded",
      body: "The payment was returned in full and the dates were released.",
    },
  };
  const copy = statusCopy[booking.status] ?? statusCopy.booked;

  return (
    <div className="container-page py-9 lg:py-12">
      {query.paid === "1" && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-pine/20 bg-pine-soft px-4 py-3 text-[12.5px] text-pine">
          <Icon name="check" size={16} className="mt-0.5" />
          Payment captured and verified. Your booking is confirmed — a receipt is in your notifications.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/bookings" className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
            <Icon name="arrow-left" size={13} /> All trips
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <StatusBadge status={booking.payment_status} dot={false} />
            <span className="text-[11px] text-muted">Booking {booking.code}</span>
          </div>
          <h1 className="display mt-2 text-[34px] leading-tight text-ink sm:text-[40px]">{booking.property_title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            <Icon name="pin" size={12} /> {booking.property_city}, {booking.property_state}
            <span>·</span>
            {formatDateRange(booking.check_in, booking.check_out)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {booking.status === "held" && (
            <ButtonLink href={`/checkout/${booking.id}`}>
              <Icon name="credit-card" size={15} /> Complete payment
            </ButtonLink>
          )}
          {conversation && (
            <ButtonLink href={`/messages/${conversation.id}`} variant="outline">
              <Icon name="message" size={15} /> Message host
            </ButtonLink>
          )}
          {canCancel && (
            <CancelBookingButton
              bookingId={booking.id}
              label={booking.status === "held" ? "Release hold" : "Cancel booking"}
              variant="ghost"
            />
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="surface overflow-hidden">
            <div className="relative h-44 sm:h-52">
              <ArtImage r2Key={booking.cover_key} url={booking.cover_url} type={booking.property_type} alt={booking.property_title} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cream/65">{copy.title}</p>
                <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-cream/85">{copy.body}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {[
                ["Check-in", `${formatDate(booking.check_in, "short")} · ${rules?.check_in_time ?? "14:00"}`],
                ["Check-out", `${formatDate(booking.check_out, "short")} · ${rules?.check_out_time ?? "11:00"}`],
                ["Nights", String(booking.nights)],
                ["Guests", String(booking.guests)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[20px] text-ink">Price breakdown</h2>
              <span className="text-[11px] text-muted">{formatINR(booking.nightly_price)} / night</span>
            </div>
            <div className="mt-4 space-y-2.5 text-[12.5px]">
              {priceLines.map(([label, value]) => (
                <div key={label} className="flex justify-between text-muted">
                  <span>{label}</span>
                  <span className="text-ink">{formatINR(value)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-3 text-[14px] font-medium text-ink">
                <span>Total</span>
                <span>{formatINR(booking.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-[20px] text-ink">Booking timeline</h2>
            <ol className="mt-4 space-y-4">
              {[
                {
                  label: "Reservation created",
                  at: booking.created_at,
                  detail: `${booking.nights} nights held for 15 minutes`,
                },
                ...timeline.payments.map((payment) => ({
                  label: payment.status === "paid" ? "Payment captured" : `Payment ${payment.status}`,
                  at: payment.created_at,
                  detail: `${formatINR(payment.amount)}${payment.method ? ` · ${payment.method}` : ""}`,
                })),
                ...timeline.refunds.map((refund) => ({
                  label: `Refund ${refund.status}`,
                  at: refund.created_at,
                  detail: formatINR(refund.amount),
                })),
                ...timeline.logs.map((log) => ({
                  label: titleCase(log.action.replace(/\./g, " ")),
                  at: log.created_at,
                  detail: log.metadata ?? "",
                })),
                ...(booking.status === "completed"
                  ? [{ label: "Stay completed", at: booking.check_out, detail: "Review unlocked" }]
                  : []),
              ]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((event, index) => (
                  <li key={`${event.label}-${index}`} className="relative flex gap-3 pl-1">
                    <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-pine/70 ring-4 ring-pine-soft" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-ink">{event.label}</p>
                      <p className="text-[10.5px] text-muted">{formatDateTime(event.at)}</p>
                      {event.detail && <p className="mt-0.5 text-[11px] text-ink-soft">{event.detail}</p>}
                    </div>
                  </li>
                ))}
            </ol>
          </div>

          {canReview && (
            <div className="surface p-5">
              <h2 className="font-display text-[20px] text-ink">How was your stay?</h2>
              <p className="mt-1 text-[12px] text-muted">
                Reviews are published instantly and help the next guest choose well.
              </p>
              <div className="mt-4">
                <ReviewForm bookingId={booking.id} />
              </div>
            </div>
          )}

          {review && (
            <div className="flex items-center gap-2 rounded-xl border border-pine/20 bg-pine-soft px-4 py-3 text-[12px] text-pine">
              <Icon name="star" size={15} className="fill-current" />
              You reviewed this stay — {review.rating}/5. Thank you.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center gap-2.5">
              <Avatar name={booking.owner_name} size={38} color="#22483B" />
              <div>
                <p className="text-[12.5px] font-medium text-ink">{booking.owner_name}</p>
                <p className="text-[10.5px] text-muted">Your host</p>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              {rules?.house_rules ?? "The host will share arrival details before check-in."}
            </p>
            {conversation ? (
              <ButtonLink href={`/messages/${conversation.id}`} variant="outline" size="sm" className="mt-3 w-full">
                <Icon name="message" size={14} /> Open message thread
              </ButtonLink>
            ) : (
              <p className="mt-3 text-[10.5px] text-muted">Messaging opens once the booking is confirmed.</p>
            )}
          </div>

          <div className="surface p-5">
            <p className="eyebrow mb-2">Cancellation policy</p>
            <p className="text-[12px] leading-relaxed text-ink-soft">
              {rules?.cancellation_policy === "flexible"
                ? "Free cancellation until 24 hours before check-in."
                : rules?.cancellation_policy === "strict"
                  ? "50% refund until 7 days before check-in. Non-refundable after that."
                  : "Free cancellation until 5 days before check-in, then 50% refund until 2 days before."}
            </p>
            <p className="mt-2 text-[10.5px] text-muted">
              Today is {formatDate(todayISO(), "long")}. Refund eligibility is calculated at the moment of cancellation.
            </p>
          </div>

          <div className="surface p-5">
            <p className="eyebrow mb-2">Need help?</p>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Write to <span className="text-ink">support@nivas.test</span> with booking {booking.code}.
              The platform team can see the payment and audit trail.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
