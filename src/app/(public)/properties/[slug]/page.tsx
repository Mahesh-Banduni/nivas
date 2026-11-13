import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtImage } from "@/components/property/art-image";
import { PropertyCard } from "@/components/property/property-card";
import { WishlistButton } from "@/components/property/wishlist-button";
import { MessageHost } from "@/components/property/message-host";
import { BookingWidget } from "@/components/booking/booking-widget";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Icon, Stars } from "@/components/ui/icon";
import { formatDate } from "@/lib/date";
import { cancellationCopy, typeLabel } from "@/lib/labels";
import { getCurrentUser } from "@/modules/auth/session";
import { getPropertyPage, recordPropertyView } from "@/modules/properties/property.service";
import { savedPropertyIds } from "@/modules/wishlist/wishlist.service";
import { suggestedDates } from "@/modules/bookings/booking.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPropertyPage(slug);
  if (!page) return { title: "Stay not found" };
  return {
    title: `${page.property.title} · ${page.property.city}`,
    description: page.property.description?.slice(0, 155),
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page, user] = await Promise.all([getPropertyPage(slug), getCurrentUser()]);
  if (!page) notFound();
  const { property, similar, reviews, ownerStats } = page;

  const isOwner = user?.id === property.owner_id;
  const isAdmin = user?.roles.includes("admin");
  if (property.status !== "published" && !isOwner && !isAdmin) notFound();

  await recordPropertyView(property.id);
  const saved = user ? await savedPropertyIds(user.id) : [];
  const dates = suggestedDates();
  const description = (property.description ?? "").split("\n").filter(Boolean);
  const ratingBuckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => Math.round(review.rating) === stars).length,
  }));
  const maxBucket = Math.max(...ratingBuckets.map((bucket) => bucket.count), 1);
  const hasCoordinates =
    property.latitude !== null &&
    property.longitude !== null &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude) &&
    property.latitude >= -90 &&
    property.latitude <= 90 &&
    property.longitude >= -180 &&
    property.longitude <= 180;
  const approximateLocation = hasCoordinates
    ? {
        latitude: Number(property.latitude!.toFixed(2)),
        longitude: Number(property.longitude!.toFixed(2)),
      }
    : null;
  const mapHref = approximateLocation
    ? `https://www.openstreetmap.org/?mlat=${approximateLocation.latitude}&mlon=${approximateLocation.longitude}#map=14/${approximateLocation.latitude}/${approximateLocation.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(
        [property.neighborhood, property.city, property.state].filter(Boolean).join(", "),
      )}`;
  const mapEmbedUrl = approximateLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${[
        approximateLocation.longitude - 0.025,
        approximateLocation.latitude - 0.018,
        approximateLocation.longitude + 0.025,
        approximateLocation.latitude + 0.018,
      ]
        .join("%2C")}&layer=mapnik&marker=${approximateLocation.latitude}%2C${approximateLocation.longitude}`
    : null;

  return (
    <div className="container-page py-6 lg:py-9">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
            <Link href="/search" className="hover:text-ink">Stays</Link>
            <span>/</span>
            <Link href={`/search?city=${encodeURIComponent(property.city)}`} className="hover:text-ink">
              {property.city}
            </Link>
            <span>/</span>
            <span className="text-ink-soft">{property.neighborhood ?? property.city}</span>
          </nav>
          <h1 className="display mt-3 max-w-3xl text-[36px] leading-[1.05] text-ink sm:text-[46px]">
            {property.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-soft">
            {property.rating_count > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="star" size={13} className="fill-clay text-clay" />
                <strong className="font-medium">{property.rating_avg.toFixed(2)}</strong>
                <span className="text-muted">({property.rating_count} reviews)</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="pin" size={13} className="text-muted" />
              {property.neighborhood ? `${property.neighborhood}, ` : ""}{property.city}, {property.state}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-muted" /> {typeLabel(property.property_type)}
            </span>
            {property.status !== "published" && <StatusBadge status={property.status} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WishlistButton propertyId={property.id} initialSaved={saved.includes(property.id)} variant="inline" />
          <MessageHost propertyId={property.id} propertyTitle={property.title} signedIn={Boolean(user)} />
        </div>
      </div>

      {property.images.length > 0 ? (
        <div className="mt-6 grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
          {property.images.slice(0, 5).map((image, index) => (
            <div
              key={image.id}
              className={`relative overflow-hidden bg-sand ${
                index === 0
                  ? "col-span-4 row-span-2 sm:col-span-2"
                  : "hidden sm:block"
              }`}
            >
              <ArtImage
                mediaKey={image.r2_key}
                url={image.url}
                type={property.property_type}
                alt={image.alt ?? property.title}
                priority={index === 0}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="surface-quiet mt-6 p-5 text-[13px] text-muted">No photos uploaded.</p>
      )}

      <div className="mt-9 grid gap-12 lg:grid-cols-[1fr_368px]">
        <div className="min-w-0">
          {/* host strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
            <div className="flex items-center gap-3">
              <Avatar name={property.owner_name} size={44} color="#22483B" />
              <div>
                <p className="text-[14px] font-medium text-ink">
                  Hosted by {property.owner_business ?? property.owner_name}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                  {property.owner_verified === "verified" && (
                    <span className="inline-flex items-center gap-1 text-pine"><Icon name="shield" size={11} /> Verified host</span>
                  )}
                  <span>{ownerStats.listings} {ownerStats.listings === 1 ? "home" : "homes"}</span>
                  <span>·</span>
                  <span>Since {property.owner_since ? new Date(property.owner_since).getUTCFullYear() : "2021"}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              {[
                [property.rating_avg > 0 ? property.rating_avg.toFixed(2) : "New", "rating"],
                ["Instant", "confirm"],
                ["24h", "support"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-[17px] text-ink">{value}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* highlights */}
          <div className="border-b border-line py-7">
            <h2 className="font-display text-[24px] text-ink">The essentials</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { icon: "home" as const, title: typeLabel(property.property_type), body: `${property.bedrooms} bedrooms · ${property.beds} beds · ${property.bathrooms} baths` },
                { icon: "guests" as const, title: `Sleeps ${property.max_guests}`, body: "Maximum guest capacity" },
                { icon: "clock" as const, title: `${property.rules?.check_in_time ?? "14:00"} check-in`, body: `Check-out by ${property.rules?.check_out_time ?? "11:00"}` },
                ...(property.featured ? [{ icon: "star" as const, title: "Featured listing", body: "Highlighted by the platform" }] : []),
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-pine">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* description */}
          {description.length > 0 && <div className="border-b border-line py-7">
            <h2 className="font-display text-[24px] text-ink">About this home</h2>
            <div className="mt-3 space-y-3 text-[13.5px] leading-[1.75] text-ink-soft">
              {description.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </div>}

          {/* amenities */}
          <div className="border-b border-line py-7">
            <h2 className="font-display text-[24px] text-ink">What this place offers</h2>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {property.amenities.map((amenity) => (
                <div key={amenity.id} className="flex items-center gap-2.5 text-[12.5px] text-ink-soft">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream text-pine">
                    <Icon name={amenity.icon} size={16} />
                  </span>
                  {amenity.name}
                </div>
              ))}
            </div>
          </div>

          {/* rules */}
          <div className="border-b border-line py-7">
            <h2 className="font-display text-[24px] text-ink">House rules & cancellation</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="surface-quiet p-4">
                <p className="eyebrow mb-2">Stay window</p>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  Minimum {property.rules?.min_nights ?? 1} nights, maximum {property.rules?.max_nights ?? 30} nights.
                  Check-in from {property.rules?.check_in_time ?? "14:00"}, check-out by {property.rules?.check_out_time ?? "11:00"}.
                </p>
                {property.rules?.house_rules && (
                  <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
                    {property.rules.house_rules}
                  </p>
                )}
              </div>
              <div className="surface-quiet p-4">
                <p className="eyebrow mb-2">Cancellation</p>
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  {cancellationCopy(property.rules?.cancellation_policy)}
                </p>
              </div>
            </div>
          </div>

          {/* map */}
          <div className="border-b border-line py-7">
            <h2 className="font-display text-[24px] text-ink">Where you&apos;ll be</h2>
            <div className="relative mt-4 h-64 overflow-hidden rounded-xl border border-line bg-sand sm:h-72">
              {mapEmbedUrl ? (
                <iframe
                  title={`OpenStreetMap showing the approximate area around ${property.neighborhood ?? property.city}`}
                  src={mapEmbedUrl}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <Icon name="pin" size={24} className="text-pine" />
                  <p className="font-medium text-ink">{property.neighborhood ?? property.city}, {property.state}</p>
                  <p className="text-sm text-muted">Map preview isn&apos;t available for this listing yet.</p>
                </div>
              )}
              {approximateLocation && (
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[10.5px] text-ink shadow-sm">
                  Approximate area · {property.neighborhood ?? property.city}
                </span>
              )}
            </div>
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-pine hover:text-gold-deep"
            >
              View on OpenStreetMap <Icon name="arrow-up-right" size={13} />
            </a>
          </div>

          {/* reviews */}
          <div className="py-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-[24px] text-ink">
                Guest reviews
                {property.rating_count > 0 && <span className="ml-2 text-[14px] text-muted">({property.rating_count})</span>}
              </h2>
              <Stars rating={property.rating_avg} size={16} className="text-clay" />
            </div>

            {reviews.length ? (
              <div className="mt-5 grid gap-6 md:grid-cols-[200px_1fr]">
                <div className="space-y-1.5">
                  {ratingBuckets.map((bucket) => (
                    <div key={bucket.stars} className="flex items-center gap-2 text-[11px] text-muted">
                      <span className="w-3 text-right">{bucket.stars}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                        <div className="h-full rounded-full bg-pine/60" style={{ width: `${(bucket.count / maxBucket) * 100}%` }} />
                      </div>
                      <span className="w-4 text-right">{bucket.count}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <article key={review.id} className="border-b border-line pb-5 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={review.guest_name} color={review.avatar_color} size={32} />
                        <div>
                          <p className="text-[12.5px] font-medium text-ink">{review.guest_name}</p>
                          <p className="text-[10.5px] text-muted">{formatDate(review.created_at.slice(0, 10), "long")}</p>
                        </div>
                        <Stars rating={review.rating} size={12} className="ml-auto text-clay" />
                      </div>
                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{review.comment}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-muted">
                        {[
                          ["Cleanliness", review.cleanliness],
                          ["Accuracy", review.accuracy],
                          ["Communication", review.communication],
                          ["Location", review.location],
                          ["Value", review.value],
                        ].map(([label, value]) =>
                          value ? <span key={String(label)}>{label} {value}/5</span> : null,
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-muted">No reviews yet. This home is new to the collection.</p>
            )}
          </div>
        </div>

        {/* booking column */}
        <aside className="lg:relative">
          <div className="lg:sticky lg:top-24">
            <BookingWidget
              propertyId={property.id}
              nightlyPrice={property.nightly_price}
              maxGuests={property.max_guests}
              minNights={property.rules?.min_nights ?? 1}
              maxNights={property.rules?.max_nights ?? 30}
              signedIn={Boolean(user)}
              isOwner={Boolean(isOwner)}
              initialCheckIn={dates.checkIn}
              initialCheckOut={dates.checkOut}
              initialGuests={Math.min(2, property.max_guests)}
            />
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-cream/60 p-3.5 text-[11px] leading-relaxed text-muted">
              <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-pine" />
              <span>
                Your dates are held for 15 minutes while you check out. Payment is captured by
                Razorpay and every confirmation is verified by a signed webhook.
              </span>
            </div>
            {isOwner && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold-soft px-3.5 py-2.5 text-[11px] text-[#7d6129]">
                Owner preview
                <Link href={`/owner/properties/${property.id}/edit`} className="font-medium underline">
                  Edit listing
                </Link>
              </div>
            )}
            {isAdmin && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[11px] text-muted">
                Admin view
                <Link href="/admin/moderation" className="font-medium text-pine underline">
                  Moderation queue
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Nearby</p>
              <h2 className="display mt-2 text-[28px] text-ink">You might also like</h2>
            </div>
            <Link href="/search" className="text-[12px] text-pine hover:underline">
              All stays
            </Link>
          </div>
          <div className="mt-7 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.id} property={item} saved={saved.includes(item.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
