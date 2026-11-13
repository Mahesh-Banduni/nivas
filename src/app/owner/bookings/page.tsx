import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { CancelReservation } from "@/components/owner/cancel-reservation";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { formatDateRange, formatDateTime, todayISO } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { requireRole } from "@/modules/auth/session";
import { listOwnerReservations } from "@/modules/bookings/booking.service";

export const metadata: Metadata = { title: "Reservations" };

const TABS = [
  { id: "upcoming", label: "Arriving" },
  { id: "in-house", label: "In house" },
  { id: "past", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; focus?: string }>;
}) {
  const user = await requireRole("owner", "/owner/bookings");
  const params = await searchParams;
  const bookings = await listOwnerReservations(user.id);
  const today = todayISO();

  const grouped: Record<Tab, typeof bookings> = {
    upcoming: bookings.filter(
      (booking) => booking.status === "booked" && booking.check_in >= today,
    ),
    "in-house": bookings.filter(
      (booking) => booking.status === "booked" && booking.check_in <= today && booking.check_out > today,
    ),
    past: bookings.filter(
      (booking) => booking.status === "completed" || (booking.status === "booked" && booking.check_out <= today),
    ),
    cancelled: bookings.filter((booking) =>
      ["cancelled", "expired", "refunded"].includes(booking.status),
    ),
  };

  const tab: Tab = TABS.some((item) => item.id === params.tab) ? (params.tab as Tab) : "upcoming";
  const focused = params.focus ? bookings.find((booking) => booking.id === params.focus) : undefined;
  const list = grouped[tab];

  const confirmed = bookings.filter((booking) => ["booked", "completed"].includes(booking.status));
  const gross = confirmed.reduce((sum, booking) => sum + booking.total_amount, 0);
  const nights = confirmed.reduce((sum, booking) => sum + booking.nights, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Reservations"
        title="Guest reservations"
        description="Arrivals, in-house stays and the full booking history across every home you host."
        actions={
          <ButtonLink href="/owner/calendar" variant="outline">
            <Icon name="calendar" size={15} /> Calendar view
          </ButtonLink>
        }
      />

      {focused && (
        <div className="mb-5 rounded-xl border border-pine/25 bg-pine-soft/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Avatar name={focused.guest_name} size={40} color="#22483B" />
              <div>
                <p className="flex items-center gap-2 font-display text-[19px] text-ink">
                  {focused.guest_name}
                  <StatusBadge status={focused.status} />
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {focused.property_title} · {formatDateRange(focused.check_in, focused.check_out)} · {focused.guests} guests
                </p>
                <p className="mt-1 text-[10.5px] text-muted">
                  {focused.guest_email} · booked {formatDateTime(focused.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={focused.payment_status === "paid" ? "pine" : "gold"} dot>
                {focused.payment_status === "paid" ? "Paid" : "Payment " + focused.payment_status}
              </Badge>
              <ButtonLink href={`/owner/messages?booking=${focused.id}`} variant="outline" size="sm">
                <Icon name="message" size={13} /> Message guest
              </ButtonLink>
            </div>
          </div>
          <div className="mt-3 grid gap-3 border-t border-pine/15 pt-3 text-[11px] sm:grid-cols-4">
            {[
              ["Booking code", focused.code],
              ["Nights", String(focused.nights)],
              ["Booking value", formatINR(focused.total_amount)],
              ["Your payout", formatINR(Math.round(focused.subtotal * 0.85) + focused.cleaning_fee)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-muted">{label}</p>
                <p className="mt-0.5 font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Arriving next" value={String(grouped.upcoming.length)} icon="calendar" hint="Confirmed and scheduled" />
        <StatCard label="In house today" value={String(grouped["in-house"].length)} icon="guests" hint="Guests currently staying" />
        <StatCard label="Confirmed value" value={formatINR(gross, { compact: true })} icon="wallet" hint="Gross, before commission" />
        <StatCard label="Booked nights" value={String(nights)} icon="chart" hint={`Across ${confirmed.length} reservations`} />
      </div>

      <Panel
        className="mt-5"
        title="Bookings"
        action={<span className="text-[10.5px] text-muted">{bookings.length} total</span>}
        bodyClassName="p-0"
      >
        <div className="flex gap-1 overflow-x-auto border-b border-line px-4">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={`/owner/bookings?tab=${item.id}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] transition ${
                tab === item.id ? "border-pine font-medium text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-[10px] text-muted">{grouped[item.id].length}</span>
            </Link>
          ))}
        </div>

        {list.length ? (
          <DataTable
            head={
              <tr>
                <th>Guest</th>
                <th>Home</th>
                <th>Stay</th>
                <th>Status</th>
                <th>Value</th>
                <th />
              </tr>
            }
          >
            {list.map((booking) => {
              const cancellable = ["booked", "held"].includes(booking.status) && booking.check_in > today;
              return (
                <tr key={booking.id} className={booking.id === params.focus ? "bg-pine-soft/50" : undefined}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={booking.guest_name} size={30} color="#22483B" />
                      <div className="min-w-0">
                        <Link href={`/owner/bookings?tab=${tab}&focus=${booking.id}`} className="block truncate font-medium text-ink hover:text-pine">
                          {booking.guest_name}
                        </Link>
                        <p className="truncate text-[10px] text-muted">{booking.code} · {booking.guests} guests</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="max-w-40 truncate text-[12px] text-ink">{booking.property_title}</p>
                    <p className="text-[10px] text-muted">{booking.property_city}</p>
                  </td>
                  <td className="whitespace-nowrap text-[11.5px] text-ink">
                    {formatDateRange(booking.check_in, booking.check_out)}
                    <p className="text-[10px] text-muted">{booking.nights} nights</p>
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={booking.status} />
                      {booking.payment_status !== "paid" && <span className="text-[9.5px] text-muted">{booking.payment_status}</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink">{formatINR(booking.total_amount)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/owner/bookings?tab=${tab}&focus=${booking.id}`} className="btn btn-ghost btn-sm">
                        Details
                      </Link>
                      {cancellable && <CancelReservation bookingId={booking.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        ) : (
          <EmptyState
            className="m-5"
            icon="calendar"
            title={
              tab === "upcoming"
                ? "No arrivals scheduled"
                : tab === "in-house"
                  ? "No guests in house"
                  : tab === "past"
                    ? "No completed stays yet"
                    : "No cancellations"
            }
            description={
              tab === "cancelled"
                ? "Cancellations and expired holds will appear here."
                : "Publish more dates or share your listing link to fill the calendar."
            }
            action={<ButtonLink href="/owner/calendar" variant="outline">Open calendar</ButtonLink>}
          />
        )}
      </Panel>

      <p className="mt-3 text-[10.5px] text-muted">
        Holds expire automatically after 15 minutes. Refunds follow the listing&apos;s cancellation policy and are
        reconciled through the payment ledger.
      </p>
    </div>
  );
}
