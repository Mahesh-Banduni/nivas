import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { formatDateTime, timeAgo } from "@/lib/date";
import { requireRole } from "@/modules/auth/session";
import { listOutboxEvents } from "@/modules/admin/admin.service";
import { listAuditLogs } from "@/modules/admin/audit";
import { outboxStats } from "@/modules/notifications/outbox";

export const metadata: Metadata = { title: "Audit log" };

function actionTone(action: string) {
  if (action.includes("suspend") || action.includes("reject") || action.includes("failed")) return "rose" as const;
  if (action.includes("approve") || action.includes("published") || action.includes("verified")) return "pine" as const;
  if (action.includes("featured")) return "gold" as const;
  return "neutral" as const;
}

export default async function AdminAuditPage() {
  await requireRole("admin", "/admin/audit");
  const db = await getDb();
  const [logs, events, stats] = await Promise.all([
    listAuditLogs(db, 80),
    listOutboxEvents(db, 40),
    outboxStats(db),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Traceability"
        title="Audit & events"
        description="Every privileged action and the transactional outbox that carries domain events to notification handlers."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-[10.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pine animate-dot" /> append-only
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Audit entries" value={String(logs.length)} icon="key" hint="Most recent 80 actions" />
        <StatCard label="Events pending" value={String(stats.pending)} icon="clock" hint="Waiting for the cron endpoint" />
        <StatCard label="Events handled" value={String(stats.published)} icon="check" hint="Processed by inline handlers" />
        <StatCard label="Events failed" value={String(stats.failed)} icon="alert" hint="Retried with exponential backoff" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Audit trail" action={<span className="text-[10.5px] text-muted">{logs.length} entries</span>} bodyClassName="p-0">
          {logs.length ? (
            <DataTable
              head={
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Detail</th>
                  <th>When</th>
                </tr>
              }
            >
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <Badge tone={actionTone(log.action)} dot={false}>{log.action}</Badge>
                  </td>
                  <td className="text-[11px] text-ink">{log.actor_name ?? "System"}</td>
                  <td>
                    <p className="text-[10.5px] text-ink">{log.entity_type}</p>
                    <p className="max-w-32 truncate font-mono text-[9px] text-muted">{log.entity_id ?? "—"}</p>
                  </td>
                  <td className="max-w-52 truncate text-[10.5px] text-muted">{log.metadata ?? "—"}</td>
                  <td className="whitespace-nowrap text-[10px] text-muted" title={formatDateTime(log.created_at)}>
                    {timeAgo(log.created_at)}
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState className="m-5" icon="key" title="No audit entries" description="Privileged actions will be recorded here." />
          )}
        </Panel>

        <Panel title="Outbox events" action={<span className="text-[10.5px] text-muted">newest first</span>} bodyClassName="p-0">
          {events.length ? (
            <div className="divide-y divide-line">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink">{event.type}</p>
                      <p className="truncate font-mono text-[9px] text-muted">
                        {event.aggregate_type}/{event.aggregate_id}
                      </p>
                    </div>
                    <StatusBadge status={event.status} dot={false} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[9.5px] text-muted">
                    <span>attempts {event.attempts} · {timeAgo(event.created_at)}</span>
                    {event.published_at && <span className="inline-flex items-center gap-1 text-pine"><Icon name="check" size={10} /> delivered</span>}
                  </div>
                  {event.last_error && <p className="mt-1 truncate text-[9px] text-rose">{event.last_error}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className="m-5" icon="inbox" title="No events yet" description="Domain events are written in the same batch as the business change." />
          )}
        </Panel>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-[#f4efe5] p-5">
        <p className="eyebrow mb-2">Architecture note</p>
        <p className="max-w-3xl text-[11.5px] leading-relaxed text-muted">
          Audit rows and outbox rows are never updated in place. The outbox is drained by the cron endpoint; domain events
          are processed inline so notification side effects remain observable. Failed events
          retry with exponential backoff up to five attempts before being parked for inspection.
        </p>
      </div>
    </div>
  );
}
