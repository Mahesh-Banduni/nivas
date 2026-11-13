import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AreaChart, DistributionBars } from "@/components/ui/chart";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { formatDateRange, timeAgo } from "@/lib/date";
import { formatINR, formatNumber } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { getAdminOverview } from "@/modules/admin/admin.service";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  await requireRole("admin", "/admin");
  const data = await getAdminOverview();
  const { totals } = data;
  const queue = data.moderationQueue.filter((item) => item.status === "pending");

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Marketplace health"
        description="Everything moving through Nivas — supply, demand, money and the event pipeline behind it."
        actions={
          <>
            <ButtonLink href="/admin/moderation">
              <Icon name="shield" size={15} /> Review queue
              {queue.length > 0 && <span className="ml-1 rounded-full bg-cream/25 px-1.5 text-[10px]">{queue.length}</span>}
            </ButtonLink>
            <ButtonLink href="/admin/audit" variant="outline">
              <Icon name="key" size={15} /> Audit log
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross bookings"
          value={formatINR(totals.gmv, { compact: true })}
          icon="wallet"
          hint={`${formatNumber(totals.bookings)} bookings · ${totals.cancellations} cancelled`}
        />
        <StatCard
          label="Platform revenue"
          value={formatINR(totals.platform_revenue, { compact: true })}
          icon="trend-up"
          hint={`${formatINR(totals.owner_earnings, { compact: true })} to hosts`}
        />
        <StatCard
          label="Live properties"
          value={String(totals.live_properties)}
          icon="home"
          hint={`${totals.pending_properties} awaiting review`}
        />
        <StatCard
          label="Active users"
          value={String(totals.active_users)}
          icon="user"
          hint={`${totals.total_users} registered accounts`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Paid volume" action={<span className="text-[10.5px] text-muted">Last 6 months · captured payments</span>}>
          <AreaChart series={data.revenueSeries} height={210} />
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
            {[
              ["Confirmed", String(totals.upcoming_bookings)],
              ["Pending listings", String(totals.pending_properties)],
              ["Events pending", String(data.outbox.pending)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                <p className="mt-0.5 font-display text-[20px] text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Needs attention"
          action={<Link href="/admin/moderation" className="text-[11px] text-pine hover:underline">Open queue</Link>}
        >
          {data.moderationQueue.length ? (
            <div className="divide-y divide-line">
              {data.moderationQueue.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-pine">
                    <Icon name="home" size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/moderation?focus=${item.id}`} className="block truncate text-[12.5px] font-medium text-ink hover:text-pine">
                      {item.title}
                    </Link>
                    <p className="truncate text-[10.5px] text-muted">
                      {item.owner_name} · {item.city} · {typeLabel(item.property_type)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">Updated {timeAgo(item.updated_at)}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="check"
              title="Queue is clear"
              description="Every submitted listing has been reviewed. New submissions appear here instantly."
            />
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Recent bookings" action={<Link href="/admin/bookings" className="text-[11px] text-pine hover:underline">All bookings</Link>} bodyClassName="p-0">
          <DataTable
            head={
              <tr>
                <th>Guest</th>
                <th>Home</th>
                <th>Stay</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            }
          >
            {data.recentBookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <p className="font-medium text-ink">{booking.guest_name}</p>
                  <p className="text-[10px] text-muted">{booking.code}</p>
                </td>
                <td className="max-w-40 truncate text-[11.5px] text-ink">{booking.property_title}</td>
                <td className="whitespace-nowrap text-[10.5px] text-muted">{formatDateRange(booking.check_in, booking.check_out)}</td>
                <td><StatusBadge status={booking.status} /></td>
                <td className="whitespace-nowrap text-ink">{formatINR(booking.total_amount)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="Event pipeline" action={<Link href="/admin/audit" className="text-[11px] text-pine hover:underline">Audit</Link>}>
          <div className="space-y-3">
            {[
              { label: "Pending", value: data.outbox.pending, tone: "gold" as const },
              { label: "Published", value: data.outbox.published, tone: "pine" as const },
              { label: "Failed", value: data.outbox.failed, tone: "rose" as const },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-cream/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Badge tone={item.tone} dot>{item.label}</Badge>
                  <span className="text-[10.5px] text-muted">transactional outbox</span>
                </div>
                <span className="font-display text-[18px] text-ink">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">
            Business changes and their events commit in the same D1 batch. The cron endpoint drains pending rows for inline processing.
          </p>

          <div className="mt-4 border-t border-line pt-4">
            <p className="eyebrow mb-2">Newest accounts</p>
            <div className="space-y-2">
              {data.users.slice(0, 4).map((user) => (
                <div key={user.id} className="flex items-center gap-2.5">
                  <Avatar name={user.full_name} color={user.avatar_color} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] text-ink">{user.full_name}</p>
                    <p className="truncate text-[9.5px] text-muted">{user.roles ?? "guest"}</p>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Demand by city" action={<span className="text-[10.5px] text-muted">paid GMV</span>}>
          {data.cities.length ? (
            <DistributionBars
              items={data.cities.map((row) => ({
                label: row.city,
                value: row.gmv,
                meta: `${row.bookings} bookings`,
              }))}
              formatValue={(value) => formatINR(value, { compact: true })}
            />
          ) : (
            <p className="text-[11.5px] text-muted">No captured payments yet.</p>
          )}
        </Panel>

        <Panel title="Bookings by home type" action={<span className="text-[10.5px] text-muted">paid GMV</span>}>
          {data.types.length ? (
            <DistributionBars
              items={data.types.map((row) => ({
                label: typeLabel(row.type),
                value: row.gmv,
                meta: `${row.bookings} bookings`,
              }))}
              formatValue={(value) => formatINR(value, { compact: true })}
            />
          ) : (
            <p className="text-[11.5px] text-muted">No captured payments yet.</p>
          )}
        </Panel>

        <Panel title="Recent payments" action={<Link href="/admin/payments" className="text-[11px] text-pine hover:underline">Ledger</Link>}>
          <div className="space-y-2.5">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] text-ink">{payment.guest_name}</p>
                  <p className="text-[9.5px] text-muted">{payment.booking_code} · {payment.method ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] font-medium text-ink">{formatINR(payment.amount)}</p>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
