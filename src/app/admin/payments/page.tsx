import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { formatDateRange, formatDateTime } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { requireRole } from "@/modules/auth/session";
import { listAllPayments, listAllRefunds } from "@/modules/admin/admin.service";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  await requireRole("admin", "/admin/payments");
  const db = await getDb();
  const [payments, refunds] = await Promise.all([listAllPayments(db, 200), listAllRefunds(db, 50)]);

  const captured = payments.filter((payment) => payment.status === "paid");
  const capturedAmount = captured.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = payments.filter((payment) => ["created", "pending"].includes(payment.status));
  const failed = payments.filter((payment) => payment.status === "failed");
  const refunded = payments.filter((payment) => payment.status === "refunded");

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Payment ledger"
        description="Captured payments, pending orders and failures across Razorpay. Webhooks are signature-verified and idempotent."
        actions={
          <Link href="/admin/bookings" className="btn btn-outline">
            <Icon name="calendar" size={14} /> All bookings
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Captured" value={formatINR(capturedAmount, { compact: true })} icon="wallet" hint={`${captured.length} successful payments`} />
        <StatCard label="Pending" value={String(pending.length)} icon="clock" hint="Awaiting provider confirmation" />
        <StatCard label="Failed" value={String(failed.length)} icon="close" hint="Guest retried or hold released" />
        <StatCard label="Refunded" value={formatINR(refunded.reduce((sum, payment) => sum + payment.amount, 0), { compact: true })} icon="refresh" hint={`${refunded.length} reversals`} />
      </div>

      <Panel className="mt-5" title="Transactions" action={<span className="text-[10.5px] text-muted">{payments.length} records</span>} bodyClassName="p-0">
        {payments.length ? (
          <DataTable
            head={
              <tr>
                <th>Payment</th>
                <th>Booking</th>
                <th>Guest</th>
                <th>Stay</th>
                <th>Method</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            }
          >
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <p className="font-mono text-[10px] text-ink">{payment.provider_payment_id ?? payment.id}</p>
                  <p className="font-mono text-[9px] text-muted">{payment.provider_order_id ?? "—"}</p>
                </td>
                <td>
                  <p className="font-mono text-[10px] text-ink">{payment.booking_code}</p>
                  <p className="truncate text-[9.5px] text-muted">{payment.property_title}</p>
                </td>
                <td className="text-[11.5px] text-ink">{payment.guest_name}</td>
                <td className="whitespace-nowrap text-[10px] text-muted">{formatDateRange(payment.check_in, payment.check_out)}</td>
                <td className="text-[10.5px] text-ink">
                  {payment.method ?? "—"}
                  <p className="text-[9px] uppercase tracking-wide text-muted">{payment.provider}</p>
                </td>
                <td>
                  <Badge tone={payment.status === "paid" ? "pine" : payment.status === "failed" ? "rose" : "gold"} dot>
                    {payment.status}
                  </Badge>
                  {payment.failure_reason && <p className="mt-1 max-w-40 truncate text-[9px] text-rose">{payment.failure_reason}</p>}
                </td>
                <td className="whitespace-nowrap text-ink">{formatINR(payment.amount)}</td>
                <td className="whitespace-nowrap text-[9.5px] text-muted">{formatDateTime(payment.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState className="m-5" icon="wallet" title="No payments yet" description="Captured and pending payments will appear here." />
        )}
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Refunds & reversals" action={<span className="text-[10.5px] text-muted">{refunds.length} records</span>} bodyClassName="p-0">
          {refunds.length ? (
            <DataTable
              head={
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Reason</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              }
            >
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td>
                    <p className="font-mono text-[10px] text-ink">{refund.booking_code}</p>
                    <p className="font-mono text-[9px] text-muted">{refund.provider_refund_id ?? refund.id}</p>
                  </td>
                  <td className="text-[11px] text-ink">{refund.guest_name}</td>
                  <td className="max-w-40 truncate text-[10.5px] text-muted">{refund.reason}</td>
                  <td className="text-[10px] uppercase tracking-wide text-muted">{refund.provider}</td>
                  <td>
                    <Badge tone={refund.status === "completed" ? "pine" : refund.status === "failed" ? "rose" : "gold"} dot>
                      {refund.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap text-ink">{formatINR(refund.amount)}</td>
                  <td className="whitespace-nowrap text-[9.5px] text-muted">{formatDateTime(refund.created_at)}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState className="m-5" icon="refresh" title="No refunds yet" description="Cancellations that trigger a refund are recorded here against the original payment." />
          )}
        </Panel>

        <Panel title="Reconciliation">
          <div className="space-y-3 text-[11.5px] leading-relaxed text-muted">
            {[
              ["Captured", `${captured.length} payments · ${formatINR(capturedAmount)}`],
              ["Refunded", `${refunds.filter((refund) => refund.status === "completed").length} completed · ${formatINR(refunds.filter((refund) => refund.status === "completed").reduce((sum, refund) => sum + refund.amount, 0))}`],
              ["In flight", `${refunds.filter((refund) => ["pending", "processing"].includes(refund.status)).length} awaiting provider`],
              ["Failed", `${refunds.filter((refund) => refund.status === "failed").length} requiring retry`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                <span>{label}</span>
                <span className="text-right font-medium text-ink">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-sand/60 px-3 py-2.5 text-[10px] leading-relaxed text-muted">
            Net captured volume is always payments minus completed refunds. Provider events are recorded in
            <code className="mx-1 rounded bg-cream px-1">payment_events</code>with a unique key, so replays are ignored.
          </p>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {[
          { icon: "shield" as const, title: "Signed webhooks", body: "Every Razorpay callback is HMAC-verified before the booking is settled. Replays are deduplicated by event id." },
          { icon: "refresh" as const, title: "Idempotent settlement", body: "settlePayment() is safe to call twice — commissions, outbox events and notifications are written exactly once." },
          { icon: "wallet" as const, title: "Ledger first", body: "Refunds are recorded separately against the payment, so revenue and payouts always reconcile." },
        ].map((card) => (
          <div key={card.title} className="rounded-xl border border-line bg-cream/70 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-pine">
              <Icon name={card.icon} size={15} />
            </span>
            <p className="mt-2.5 font-display text-[16px] text-ink">{card.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
