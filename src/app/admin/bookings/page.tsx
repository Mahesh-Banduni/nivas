import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { formatDateRange, formatDateTime, todayISO } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { requireRole } from "@/modules/auth/session";
import { listAllBookings } from "@/modules/admin/admin.service";

export const metadata: Metadata = { title: "All bookings" };

const FILTERS = ["all", "booked", "held", "completed", "cancelled"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("admin", "/admin/bookings");
  const params = await searchParams;
  const db = await getDb();
  const bookings = await listAllBookings(db, 200);
  const today = todayISO();

  const status = (FILTERS as readonly string[]).includes(params.status ?? "") ? params.status! : "all";
  const items = status === "all" ? bookings : bookings.filter((booking) => booking.status === status);

  const confirmed = bookings.filter((booking) => ["booked", "completed"].includes(booking.status));
  const gmv = confirmed.reduce((sum, booking) => sum + booking.total_amount, 0);
  const upcoming = bookings.filter((booking) => booking.status === "booked" && booking.check_in >= today);
  const cancellations = bookings.filter((booking) => booking.status === "cancelled").length;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Every booking"
        description="The full reservation ledger — guests, hosts, nights and the money attached to each stay."
        actions={
          <Link href="/admin/payments" className="btn btn-outline">
            <Icon name="wallet" size={14} /> Payment ledger
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total bookings" value={String(bookings.length)} icon="calendar" hint={`${upcoming.length} upcoming`} />
        <StatCard label="Confirmed GMV" value={formatINR(gmv, { compact: true })} icon="wallet" hint="Booked and completed stays" />
        <StatCard label="Cancellations" value={String(cancellations)} icon="close" hint="Refund policy applied per listing" />
        <StatCard
          label="Avg. booking value"
          value={confirmed.length ? formatINR(Math.round(gmv / confirmed.length), { compact: true }) : "—"}
          icon="trend-up"
          hint={`${confirmed.length} confirmed bookings`}
        />
      </div>

      <Panel className="mt-5" title="Reservations" action={<span className="text-[10.5px] text-muted">{items.length} shown</span>} bodyClassName="p-0">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-4">
          {FILTERS.map((item) => (
            <Link
              key={item}
              href={`/admin/bookings?status=${item}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] capitalize transition ${
                status === item ? "border-pine font-medium text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item}
              <span className="ml-1.5 text-[10px] text-muted">
                {item === "all" ? bookings.length : bookings.filter((booking) => booking.status === item).length}
              </span>
            </Link>
          ))}
        </div>

        {items.length ? (
          <DataTable
            head={
              <tr>
                <th>Booking</th>
                <th>Guest</th>
                <th>Home & host</th>
                <th>Stay</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
              </tr>
            }
          >
            {items.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <p className="font-mono text-[10.5px] text-ink">{booking.code}</p>
                  <p className="text-[9.5px] text-muted">{formatDateTime(booking.created_at)}</p>
                </td>
                <td>
                  <p className="text-[11.5px] font-medium text-ink">{booking.guest_name}</p>
                  <p className="text-[9.5px] text-muted">{booking.guest_email}</p>
                </td>
                <td className="max-w-44">
                  <p className="truncate text-[11.5px] text-ink">{booking.property_title}</p>
                  <p className="truncate text-[9.5px] text-muted">{booking.owner_name}</p>
                </td>
                <td className="whitespace-nowrap text-[10.5px] text-ink">
                  {formatDateRange(booking.check_in, booking.check_out)}
                  <p className="text-[9.5px] text-muted">{booking.nights} nights · {booking.guests} guests</p>
                </td>
                <td><StatusBadge status={booking.status} /></td>
                <td><StatusBadge status={booking.payment_status} dot={false} /></td>
                <td className="whitespace-nowrap text-ink">{formatINR(booking.total_amount)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState className="m-5" icon="calendar" title="No bookings in this state" description="Try a different status filter." />
        )}
      </Panel>
    </div>
  );
}
