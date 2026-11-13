import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/shell";
import { AreaChart, DistributionBars } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { requireRole } from "@/modules/auth/session";
import { getOwnerEarnings } from "@/modules/owners/owner.service";

export const metadata: Metadata = { title: "Earnings" };

export default async function OwnerEarningsPage() {
  const user = await requireRole("owner", "/owner/earnings");
  const data = await getOwnerEarnings(user.id);
  const paidOut = data.payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + payout.amount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Earnings & payouts"
        description="What you have earned, what the platform has retained, and when the next transfer lands."
        actions={
          <ButtonLink href="/owner/bookings" variant="outline">
            <Icon name="calendar" size={15} /> Reservations
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime earnings"
          value={formatINR(data.lifetime.revenue, { compact: true })}
          icon="wallet"
          hint={`${data.lifetime.bookings} confirmed ${data.lifetime.bookings === 1 ? "booking" : "bookings"}`}
        />
        <StatCard
          label="Platform fees"
          value={formatINR(data.lifetime.fees, { compact: true })}
          icon="shield"
          hint="Commission, service fee and GST retained"
        />
        <StatCard
          label="Next payout"
          value={formatINR(data.upcomingPayout, { compact: true })}
          icon="clock"
          hint={data.upcomingPayout ? "Scheduled after the stay window" : "Nothing scheduled yet"}
        />
        <StatCard
          label="Paid to date"
          value={formatINR(paidOut, { compact: true })}
          icon="check"
          hint={`${data.payouts.filter((payout) => payout.status === "paid").length} settled transfers`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Earnings trend" action={<span className="text-[10.5px] text-muted">Last 6 months · net of commission</span>}>
          <AreaChart series={data.series} height={220} />
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
            {[
              ["Earned", formatINR(data.lifetime.revenue, { compact: true })],
              ["Fees", formatINR(data.lifetime.fees, { compact: true })],
              ["Bookings", String(data.lifetime.bookings)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                <p className="mt-0.5 font-display text-[20px] text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top homes" action={<span className="text-[10.5px] text-muted">by earnings</span>}>
          {data.byProperty.length ? (
            <DistributionBars
              items={data.byProperty.map((row) => ({
                label: row.title,
                value: row.revenue,
                meta: `${row.bookings} ${row.bookings === 1 ? "booking" : "bookings"}`,
              }))}
              formatValue={(value) => formatINR(value, { compact: true })}
            />
          ) : (
            <p className="text-[11.5px] text-muted">Earnings appear here once a reservation is confirmed.</p>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Payout history" action={<span className="text-[10.5px] text-muted">{data.payouts.length} transfers</span>} bodyClassName="p-0">
          {data.payouts.length ? (
            <DataTable
              head={
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Created</th>
                </tr>
              }
            >
              {data.payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="whitespace-nowrap text-ink">
                    {formatDate(payout.period_start)} – {formatDate(payout.period_end)}
                  </td>
                  <td className="whitespace-nowrap font-medium text-ink">{formatINR(payout.amount)}</td>
                  <td><Badge tone={payout.status === "paid" ? "pine" : "gold"} dot>{payout.status}</Badge></td>
                  <td className="whitespace-nowrap font-mono text-[10px] text-muted">{payout.reference ?? "—"}</td>
                  <td className="whitespace-nowrap text-[10.5px] text-muted">{formatDateTime(payout.created_at)}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState
              className="m-5"
              icon="wallet"
              title="No payouts yet"
              description="Payouts are batched after each completed stay and settled to your registered account."
              action={<ButtonLink href="/owner/bookings" variant="outline">View reservations</ButtonLink>}
            />
          )}
        </Panel>

        <Panel title="How the money splits">
          <div className="space-y-3 text-[11.5px] leading-relaxed text-muted">
            {[
              ["Nightly subtotal", "Paid by the guest for each occupied night."],
              ["Platform commission", "15% of the nightly subtotal, retained by Nivas."],
              ["Guest service fee", "8% of the subtotal, plus 18% GST on that fee — never deducted from your share."],
              ["Cleaning fee", "Passed through to you in full."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-2.5">
                <Icon name="check" size={13} className="mt-0.5 shrink-0 text-pine" />
                <p><span className="font-medium text-ink">{title}.</span> {body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-sand/60 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted">
            Balances are computed from the immutable <code className="rounded bg-cream px-1">commissions</code> ledger,
            while refunds are recorded separately so reconciliation always balances.
          </div>
        </Panel>
      </div>
    </div>
  );
}
