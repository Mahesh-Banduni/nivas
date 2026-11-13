import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { ArtImage } from "@/components/property/art-image";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DataTable, EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { timeAgo } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { getOwnerListings } from "@/modules/properties/property.service";

export const metadata: Metadata = { title: "Listings" };

export default async function OwnerPropertiesPage() {
  const user = await requireRole("owner", "/owner/properties");
  const listings = await getOwnerListings(user.id);

  const published = listings.filter((listing) => listing.status === "published");
  const inReview = listings.filter((listing) => listing.status === "pending");
  const revenue = listings.reduce((sum, listing) => sum + Number(listing.revenue ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Your listings"
        description="Every home you look after, with its live status, rate and the revenue it has earned."
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
        <StatCard label="Total listings" value={String(listings.length)} icon="home" hint={`${published.length} live on the marketplace`} />
        <StatCard label="Awaiting review" value={String(inReview.length)} icon="clock" hint="Moderation usually takes under a day" />
        <StatCard label="Lifetime revenue" value={formatINR(revenue, { compact: true })} icon="wallet" hint="Net of 15% commission" />
        <StatCard
          label="Avg. nightly rate"
          value={listings.length ? formatINR(Math.round(listings.reduce((sum, listing) => sum + listing.nightly_price, 0) / listings.length)) : "—"}
          icon="trend-up"
          hint="Across your whole portfolio"
        />
      </div>

      <Panel className="mt-5" title="All homes" action={<span className="text-[10.5px] text-muted">{listings.length} total</span>} bodyClassName="p-0">
        {listings.length ? (
          <DataTable
            head={
              <tr>
                <th>Home</th>
                <th>Status</th>
                <th>Rate</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Updated</th>
                <th />
              </tr>
            }
          >
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-14 shrink-0 overflow-hidden rounded-md bg-sand">
                      <ArtImage
                        r2Key={listing.cover_key}
                        url={listing.cover_url}
                        type={listing.property_type}
                        alt={listing.title}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/owner/properties/${listing.id}/edit`} className="block truncate font-medium text-ink hover:text-pine">
                        {listing.title}
                      </Link>
                      <p className="truncate text-[10px] text-muted">
                        {typeLabel(listing.property_type)} · {listing.city}
                      </p>
                    </div>
                  </div>
                </td>
                <td><StatusBadge status={listing.status} /></td>
                <td className="whitespace-nowrap text-ink">{formatINR(listing.nightly_price)}</td>
                <td className="text-ink">{listing.booking_count}</td>
                <td className="whitespace-nowrap text-ink">{formatINR(Number(listing.revenue ?? 0), { compact: true })}</td>
                <td className="whitespace-nowrap text-[11px] text-muted">{timeAgo(listing.updated_at)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1.5">
                    {listing.status === "published" && (
                      <Link
                        href={`/properties/${listing.slug}`}
                        target="_blank"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink"
                        aria-label="View live page"
                      >
                        <Icon name="external" size={13} />
                      </Link>
                    )}
                    <Link href={`/owner/properties/${listing.id}/edit`} className="btn btn-outline btn-sm">
                      <Icon name="edit" size={13} /> Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState
            className="m-5"
            icon="home"
            title="No listings yet"
            description="Add your first home, upload a few photographs, and submit it for review."
            action={<ButtonLink href="/owner/properties/new"><Icon name="plus" size={14} /> Add listing</ButtonLink>}
          />
        )}
      </Panel>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {[
          { icon: "image" as const, title: "Great photos sell the stay", body: "Listings with six or more images receive roughly twice the enquiries. Uploads are validated server-side by file signature." },
          { icon: "shield" as const, title: "Reviewed before going live", body: "A moderator checks every listing. Rejected drafts come back with a note so you can fix just the flagged detail." },
          { icon: "calendar" as const, title: "Availability stays honest", body: "Confirmed bookings write to a per-night ledger, so two guests can never hold the same night." },
        ].map((tip) => (
          <div key={tip.title} className="rounded-xl border border-line bg-cream/70 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand text-pine">
              <Icon name={tip.icon} size={15} />
            </span>
            <p className="mt-2.5 font-display text-[16px] text-ink">{tip.title}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{tip.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
