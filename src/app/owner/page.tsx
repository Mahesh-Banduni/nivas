import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { AreaChart } from "@/components/ui/chart";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon, Stars } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { formatDateRange, formatDateTime, timeAgo } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { getOwnerDashboard } from "@/modules/owners/owner.service";

export const metadata: Metadata = { title: "Host overview" };

export default async function OwnerOverviewPage() {
  const user = await requireRole("owner", "/owner");
  const data = await getOwnerDashboard(user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        eyebrow="Host workspace"
        title={`Good to see you, ${firstName}.`}
        description="A live read on the homes you look after — occupancy, arrivals and the money that follows."
        actions={
          <>
            <ButtonLink href="/owner/properties/new">
              <Icon name="plus" size={15} /> Add listing
            </ButtonLink>
            <ButtonLink href="/owner/calendar" variant="outline">
              <Icon name="calendar" size={15} /> Calendar
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime payout"
          value={formatINR(data.totals.revenue, { compact: true })}
          hint={`${data.totals.bookings} confirmed bookings`}
          icon="wallet"
          trend={<span className="text-[11px] text-pine">after commission</span>}
        />
        <StatCard
          label="This month"
          value={formatINR(data.monthTotals.revenue, { compact: true })}
          hint={`${data.monthTotals.bookings} bookings so far`}
          icon="trend-up"
        />
        <StatCard
          label="30-day occupancy"
          value={`${data.occupancy}%`}
          hint={`${data.publishedCount} published ${data.publishedCount === 1 ? "home" : "homes"}`}
          icon="chart"
          trend={
            <span className="inline-flex items-center gap-1 text-[10.5px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-pine animate-dot" /> live
            </span>
          }
        />
        <StatCard
          label="Guest rating"
          value={data.avgRating ? data.avgRating.toFixed(2) : "New"}
          hint={data.reviews.length ? `${data.reviews.length} recent reviews` : "Reviews unlock after stays"}
          icon="star"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Payout trend"
          action={<span className="text-[10.5px] text-muted">Last 6 months · net of commission</span>}
        >
          <AreaChart series={data.revenueSeries} height={200} />
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
            {[
              ["Avg. rating", data.avgRating ? data.avgRating.toFixed(2) : "—"],
              ["Active holds", String(data.activeHolds)],
              ["Unread messages", String(data.unreadMessages)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                <p className="mt-0.5 font-display text-[20px] text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Next arrivals" action={<Link href="/owner/bookings" className="text-[11px] text-pine hover:underline">All reservations</Link>}>
          {data.upcomingReservations.length ? (
            <div className="divide-y divide-line">
              {data.upcomingReservations.slice(0, 4).map((booking) => (
                <Link key={booking.id} href={`/owner/bookings?focus=${booking.id}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar name={booking.guest_name} size={34} color="#22483B" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-ink">{booking.guest_name}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{booking.property_title}</p>
                    <p className="mt-1 text-[10.5px] text-muted">
                      {formatDateRange(booking.check_in, booking.check_out)} · {booking.guests} guests
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="No upcoming arrivals"
              description="Published listings with open dates will start filling the calendar."
              action={<ButtonLink href="/owner/properties" variant="outline" size="sm">Review listings</ButtonLink>}
            />
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Your listings" action={<Link href="/owner/properties" className="text-[11px] text-pine hover:underline">Manage</Link>}>
          <DataTable
            head={
              <tr>
                <th>Home</th>
                <th>Status</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Rate</th>
              </tr>
            }
          >
            {data.properties.slice(0, 5).map((property) => (
              <tr key={property.id}>
                <td>
                  <Link href={`/owner/properties/${property.id}/edit`} className="font-medium text-ink hover:text-pine">
                    {property.title}
                  </Link>
                  <p className="text-[10px] text-muted">{typeLabel(property.property_type)} · {property.city}</p>
                </td>
                <td><StatusBadge status={property.status} /></td>
                <td className="text-ink">{property.booking_count}</td>
                <td className="text-ink">{formatINR(Number(property.revenue), { compact: true })}</td>
                <td className="text-ink">{formatINR(property.nightly_price)}</td>
              </tr>
            ))}
          </DataTable>
          {data.properties.length === 0 && (
            <EmptyState
              icon="home"
              title="No listings yet"
              description="Add your first home and submit it for review."
              action={<ButtonLink href="/owner/properties/new">Add listing</ButtonLink>}
            />
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Recent reviews" action={<span className="text-[10.5px] text-muted">guest feedback</span>}>
            {data.reviews.length ? (
              <div className="space-y-4">
                {data.reviews.slice(0, 3).map((review) => (
                  <div key={review.id}>
                    <div className="flex items-center gap-2">
                      <Avatar name={review.guest_name} color={review.avatar_color} size={26} />
                      <p className="text-[11.5px] font-medium text-ink">{review.guest_name}</p>
                      <Stars rating={review.rating} size={10} className="ml-auto text-clay" />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{review.comment}</p>
                    <p className="mt-1 text-[9.5px] text-muted">{review.property_title} · {timeAgo(review.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-muted">No reviews yet. Completed stays unlock them automatically.</p>
            )}
          </Panel>

          <Panel title="Payouts" action={<Link href="/owner/earnings" className="text-[11px] text-pine hover:underline">Earnings</Link>}>
            {data.payouts.length ? (
              <div className="space-y-2.5">
                {data.payouts.slice(0, 3).map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cream/60 px-3 py-2">
                    <div>
                      <p className="text-[11.5px] font-medium text-ink">{formatINR(payout.amount)}</p>
                      <p className="text-[9.5px] text-muted">{payout.period_start} → {payout.period_end}</p>
                    </div>
                    <Badge tone={payout.status === "paid" ? "pine" : "gold"} dot>{payout.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-muted">Payouts are scheduled after your first confirmed stay.</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-[#f4efe5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Operations</p>
            <h2 className="mt-1 font-display text-[19px] text-ink">Keep the calendar honest</h2>
            <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">
              Holds expire automatically after 15 minutes. Block dates for maintenance or personal
              stays so guests never see them as available.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/owner/calendar" variant="outline" size="sm">
              <Icon name="calendar" size={14} /> Block dates
            </ButtonLink>
            <ButtonLink href="/owner/messages" variant="outline" size="sm">
              <Icon name="message" size={14} /> Inbox
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
