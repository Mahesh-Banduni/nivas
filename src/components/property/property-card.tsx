import Link from "next/link";
import { ArtImage } from "./art-image";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Icon, Stars } from "@/components/ui/icon";
import { WishlistButton } from "./wishlist-button";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { PropertyCardData } from "@/db/types";

export function PropertyCard({
  property,
  saved = false,
  priority = false,
  variant = "grid",
}: {
  property: PropertyCardData;
  saved?: boolean;
  priority?: boolean;
  variant?: "grid" | "row";
}) {
  const amenities = (property.amenity_names ?? "").split("|").filter(Boolean).slice(0, 3);

  if (variant === "row") {
    return (
      <article className="group relative flex gap-4 rounded-2xl border border-line bg-white/80 p-3 transition-all hover:border-gold/30 hover:shadow-md">
        <Link
          href={`/properties/${property.slug}`}
          className="relative h-32 w-40 shrink-0 overflow-hidden rounded-xl bg-sand sm:h-36 sm:w-52"
        >
          <ArtImage
            url={property.cover_url}
            r2Key={property.cover_key}
            type={property.property_type}
            alt={property.title}
            className="h-full w-full transition duration-700 group-hover:scale-[1.04]"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-1">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-gold-deep">
                  {typeLabel(property.property_type)} · {property.city}
                </p>
                <h3 className="mt-1 truncate font-display text-lg leading-tight text-ink">
                  <Link href={`/properties/${property.slug}`} className="link-underline hover:text-gold-deep">
                    {property.title}
                  </Link>
                </h3>
              </div>
              {property.rating_count > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink">
                  <Icon name="star" size={11} className="fill-gold text-gold" />
                  {property.rating_avg.toFixed(2)}
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-1 text-[12px] text-muted">
              {property.bedrooms} bed · {property.bathrooms} bath · sleeps {property.max_guests}
              {amenities.length ? ` · ${amenities.join(" · ")}` : ""}
            </p>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-sm">
              <span className="font-semibold text-ink">{formatINR(property.nightly_price)}</span>
              <span className="text-muted"> / night</span>
            </span>
            <StatusBadge status={property.featured ? "featured" : "published"} size="sm" />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative animate-fade-up">
      <WishlistButton propertyId={property.id} initialSaved={saved} />
      <Link href={`/properties/${property.slug}`} className="block group" aria-label={`View ${property.title}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
          <ArtImage
            url={property.cover_url}
            r2Key={property.cover_key}
            type={property.property_type}
            alt={property.title}
            priority={priority}
            className="h-full w-full transition duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {/* Property type badge */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm",
              "bg-white/95 text-ink shadow-sm",
            )}>
              {typeLabel(property.property_type)}
            </span>
            {property.featured === 1 && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm",
                "bg-gold text-white shadow-gold",
              )}>
                <Icon name="star" size={10} />
                Featured
              </span>
            )}
          </div>

          {/* Rating badge */}
          {property.rating_count > 0 && (
            <div className="absolute right-3 top-3">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-sm",
                "bg-white/95 text-gold-deep shadow-sm",
              )}>
                <Icon name="star" size={11} className="fill-gold text-gold" />
                {property.rating_avg.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[20px] leading-snug text-ink group-hover:text-gold-deep transition-colors">
                {property.title}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                <Icon name="pin" size={13} className="text-gold/70" />
                {property.neighborhood ? `${property.neighborhood}, ` : ""}
                {property.city}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[15px]">
                <span className="font-semibold text-ink">{formatINR(property.nightly_price)}</span>
                <span className="text-muted"> / night</span>
              </p>
              {property.featured === 1 && (
                <StatusBadge status="featured" size="sm" showIcon />
              )}
            </div>
            <p className="text-[12.5px] text-muted flex items-center gap-1">
              <Icon name="guests" size={13} />
              sleeps {property.max_guests}
            </p>
          </div>

          {/* Quick amenities */}
          {amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenities.map((amenity) => (
                <span
                  key={amenity}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted transition-colors",
                    "hover:bg-gold-soft hover:text-gold-deep",
                  )}
                >
                  <Icon name="check" size={10} className="text-gold/50" />
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="animate-fade-up animate-pulse">
      <div className="aspect-[4/3] rounded-2xl bg-sand/70" />
      <div className="mt-4 space-y-3">
        <div className="h-5 w-2/3 rounded bg-sand/70" />
        <div className="h-3 w-1/2 rounded bg-sand/50" />
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-sand/70" />
          <div className="h-5 w-16 rounded bg-sand/50" />
        </div>
      </div>
    </div>
  );
}