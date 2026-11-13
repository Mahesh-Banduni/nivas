import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { timeAgo } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { listModerationQueue } from "@/modules/admin/admin.service";
import { featurePropertyAction, moderatePropertyAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Moderation" };

const FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "published", label: "Live" },
  { id: "flagged", label: "Rejected & suspended" },
  { id: "all", label: "Everything" },
] as const;

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; focus?: string }>;
}) {
  await requireRole("admin", "/admin/moderation");
  const params = await searchParams;
  const db = await getDb();
  const queue = await listModerationQueue(db);

  const counts = {
    pending: queue.filter((item) => item.status === "pending").length,
    published: queue.filter((item) => item.status === "published").length,
    flagged: queue.filter((item) => ["rejected", "suspended"].includes(item.status)).length,
  };

  const filter = (FILTERS.some((item) => item.id === params.filter) ? params.filter : "pending") as string;
  const items = queue.filter((item) => {
    if (filter === "all") return true;
    if (filter === "flagged") return ["rejected", "suspended"].includes(item.status);
    return item.status === filter;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Trust & safety"
        title="Listing moderation"
        description="Review submitted homes, ask for changes, or take a live listing down. Every decision is audited and notifies the host."
        actions={
          <Link href="/search" target="_blank" className="btn btn-outline">
            <Icon name="external" size={14} /> View marketplace
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value={String(counts.pending)} icon="clock" hint="Oldest first in the queue" />
        <StatCard label="Live listings" value={String(counts.published)} icon="check" hint="Visible in search" />
        <StatCard label="Flagged" value={String(counts.flagged)} icon="alert" hint="Rejected or suspended" />
        <StatCard label="Total reviewed" value={String(queue.length)} icon="shield" hint="All statuses" />
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-line">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={`/admin/moderation?filter=${item.id}`}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-[12px] transition ${
              filter === item.id ? "border-pine font-medium text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
            <span className="ml-1.5 text-[10px] text-muted">
              {item.id === "all" ? queue.length : counts[item.id as keyof typeof counts]}
            </span>
          </Link>
        ))}
      </div>

      {items.length ? (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const isFocused = item.id === params.focus;
            return (
              <article
                key={item.id}
                className={`surface p-4 sm:p-5 ${isFocused ? "ring-2 ring-pine/40" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-[10.5px] text-muted">{typeLabel(item.property_type)} · {item.city}, {item.state}</span>
                      {item.verification_status === "verified" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-pine"><Icon name="check" size={11} /> Verified host</span>
                      ) : (
                        <span className="text-[10px] text-muted">Host verification {item.verification_status ?? "pending"}</span>
                      )}
                      {item.featured === 1 && <Badge tone="gold" dot={false}>Featured</Badge>}
                    </div>
                    <h2 className="mt-1.5 font-display text-[21px] leading-tight text-ink">{item.title}</h2>
                    <p className="mt-1 text-[11.5px] text-muted">
                      {item.owner_name}
                      {item.business_name ? ` · ${item.business_name}` : ""} · {formatINR(item.nightly_price)} per night · {item.image_count} {item.image_count === 1 ? "photo" : "photos"}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">Updated {timeAgo(item.updated_at)} · <Link href={`/owner/properties/${item.id}/edit`} className="text-pine hover:underline">Open host view</Link></p>
                    {item.rejection_note && (
                      <p className="mt-2 rounded-lg border border-line bg-cream px-3 py-2 text-[10.5px] text-muted">
                        <span className="font-medium text-ink">Last note:</span> {item.rejection_note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {["pending", "rejected", "suspended"].includes(item.status) && (
                      <form action={moderatePropertyAction}>
                        <input type="hidden" name="propertyId" value={item.id} />
                        <input type="hidden" name="decision" value={item.status === "pending" ? "approve" : "restore"} />
                        <Button type="submit" size="sm">
                          <Icon name="check" size={13} /> {item.status === "pending" ? "Approve" : "Restore"}
                        </Button>
                      </form>
                    )}

                    {item.status === "published" && (
                      <>
                        <form action={featurePropertyAction}>
                          <input type="hidden" name="propertyId" value={item.id} />
                          <input type="hidden" name="featured" value={item.featured === 1 ? "0" : "1"} />
                          <Button type="submit" size="sm" variant="outline">
                            <Icon name="star" size={13} /> {item.featured === 1 ? "Unfeature" : "Feature"}
                          </Button>
                        </form>
                        <details className="relative">
                          <summary className="btn btn-outline btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                            <Icon name="alert" size={13} /> Take down
                          </summary>
                          <form action={moderatePropertyAction} className="absolute right-0 z-20 mt-1.5 w-72 space-y-2 rounded-xl border border-line bg-cream p-3 shadow-xl">
                            <input type="hidden" name="propertyId" value={item.id} />
                            <input type="hidden" name="decision" value="suspend" />
                            <label className="label" htmlFor={`suspend-${item.id}`}>Reason for the host</label>
                            <textarea id={`suspend-${item.id}`} name="note" required rows={3} className="field text-[11.5px]" placeholder="Policy breach, inaccurate listing…" />
                            <Button type="submit" size="sm" variant="clay" className="w-full">
                              <Icon name="lock" size={13} /> Suspend listing
                            </Button>
                          </form>
                        </details>
                      </>
                    )}

                    {item.status === "pending" && (
                      <details className="relative">
                        <summary className="btn btn-ghost btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          Request changes
                        </summary>
                        <form action={moderatePropertyAction} className="absolute right-0 z-20 mt-1.5 w-72 space-y-2 rounded-xl border border-line bg-cream p-3 shadow-xl">
                          <input type="hidden" name="propertyId" value={item.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <label className="label" htmlFor={`reject-${item.id}`}>What needs fixing?</label>
                          <textarea id={`reject-${item.id}`} name="note" required rows={3} className="field text-[11.5px]" placeholder="Add clearer photos of the bedroom…" />
                          <Button type="submit" size="sm" variant="clay" className="w-full">
                            <Icon name="close" size={13} /> Send back to host
                          </Button>
                        </form>
                      </details>
                    )}

                    {item.status === "published" && (
                      <Link href={`/properties/${item.id}`} target="_blank" className="btn btn-ghost btn-sm">
                        <Icon name="external" size={13} /> Live page
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon="check"
          title={filter === "pending" ? "Queue is clear" : "Nothing here"}
          description={
            filter === "pending"
              ? "Every submitted listing has been reviewed. New submissions land here automatically."
              : "No listings match this filter right now."
          }
        />
      )}

      <Panel className="mt-5" title="Moderation checklist">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Photos", "At least three clear images, no stock renders, no watermarks."],
            ["Accuracy", "Capacity, beds and amenities must match the description."],
            ["Safety", "No unsafe structures or prohibited short-let zones."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-line bg-cream/60 p-3">
              <p className="text-[11.5px] font-medium text-ink">{title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
