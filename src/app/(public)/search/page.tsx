import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { Icon } from "@/components/ui/icon";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/stat";
import { typeLabel } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { PROPERTY_TYPES } from "@/modules/properties/property.schema";
import { getCurrentUser } from "@/modules/auth/session";
import { getAmenityCatalogue, searchMarketplace } from "@/modules/properties/property.service";
import { getDestinationsCached } from "@/modules/properties/property.service";
import { savedPropertyIds } from "@/modules/wishlist/wishlist.service";

export const metadata: Metadata = { title: "Explore stays" };

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function listing(params: SearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || key in changes) continue;
    const first = single(value);
    if (first) next.set(key, first);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
  }
  return `/search${next.size ? `?${next.toString()}` : ""}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const city = single(params.city) ?? "";
  const type = single(params.type) ?? "";
  const guests = Number(single(params.guests) ?? 0) || undefined;
  const minPrice = Number(single(params.minPrice) ?? 0) || undefined;
  const maxPrice = Number(single(params.maxPrice) ?? 0) || undefined;
  const checkIn = single(params.checkIn) ?? "";
  const checkOut = single(params.checkOut) ?? "";
  const sort =
    (single(params.sort) as "recommended" | "price_asc" | "price_desc" | "rating" | "newest") ??
    "recommended";
  const page = Math.max(1, Number(single(params.page) ?? 1));
  const selectedAmenities = (
    Array.isArray(params.amenity) ? params.amenity : params.amenity ? [params.amenity] : []
  ).filter(Boolean);

  const [result, amenities, destinations, user] = await Promise.all([
    searchMarketplace({
      city: city || undefined,
      type: type || undefined,
      guests,
      minPrice: minPrice ? minPrice * 100 : undefined,
      maxPrice: maxPrice ? maxPrice * 100 : undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      amenities: selectedAmenities,
      sort,
      page,
      perPage: 12,
    }),
    getAmenityCatalogue(),
    getDestinationsCached(),
    getCurrentUser(),
  ]);
  const saved = user ? await savedPropertyIds(user.id) : [];
  const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));
  const activeFilterCount =
    [city, type, guests, minPrice, maxPrice, checkIn, checkOut].filter(Boolean).length +
    selectedAmenities.length;
  const heading = city ? `Stays in ${city}` : "Every stay, in one place";

  return (
    <div>
      {/* ── Page hero ── */}
      <div className="border-b border-line/60 bg-gradient-to-b from-[#f9f4ea] to-[#fdfaf5] py-10">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Explore</p>
              <h1 className="display text-[clamp(2rem,4vw,2.75rem)] leading-tight text-ink">
                {heading}
              </h1>
              <p className="mt-2 text-[13.5px] text-muted">
                {result.total} {result.total === 1 ? "home" : "homes"}
                {checkIn && checkOut
                  ? ` available ${checkIn} → ${checkOut}`
                  : " across the collection"}
                {guests ? ` · sleeps ${guests}+` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/destinations" className="btn btn-outline btn-sm">
                <Icon name="pin" size={14} /> Destinations
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container-page py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[248px_1fr]">
          {/* ── Filters ── */}
          <aside>
            {/* Mobile filters (collapsible) */}
            <details className="surface overflow-hidden lg:hidden" open>
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium [&::-webkit-details-marker]:hidden">
                Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
                <Icon name="sliders" size={15} className="text-muted" />
              </summary>
              <div className="border-t border-line p-4">
                <FilterForm
                  params={params}
                  city={city}
                  type={type}
                  guests={guests}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  amenities={amenities}
                  selectedAmenities={selectedAmenities}
                  destinations={destinations.map((d) => d.city)}
                  onMobile
                />
              </div>
            </details>

            {/* Desktop filters (sticky card) */}
            <div className="sticky top-24 hidden lg:block">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Refine results
                  </p>
                  {activeFilterCount > 0 && (
                    <Link
                      href="/search"
                      className="text-[11.5px] font-medium text-clay transition-colors hover:underline"
                    >
                      Clear all
                    </Link>
                  )}
                </div>
                <FilterForm
                  params={params}
                  city={city}
                  type={type}
                  guests={guests}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  amenities={amenities}
                  selectedAmenities={selectedAmenities}
                  destinations={destinations.map((d) => d.city)}
                />
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <div>
            {/* Sort chips + pagination info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
                {[
                  { value: "recommended", label: "Recommended" },
                  { value: "price_asc", label: "Price · low" },
                  { value: "price_desc", label: "Price · high" },
                  { value: "rating", label: "Top rated" },
                  { value: "newest", label: "Newest" },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={listing(params, { sort: option.value, page: undefined })}
                    className={`chip ${sort === option.value ? "chip-active" : ""}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
              <span className="text-[12px] font-medium text-muted">
                {result.page} / {totalPages}
              </span>
            </div>

            {result.items.length ? (
              <>
                <div className="mt-7 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                  {result.items.map((property, index) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      saved={saved.includes(property.id)}
                      priority={index < 3}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
                    {page > 1 ? (
                      <ButtonLink
                        href={listing(params, { page: String(page - 1) })}
                        variant="outline"
                        size="sm"
                      >
                        <Icon name="arrow-left" size={14} /> Previous
                      </ButtonLink>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages })
                        .slice(0, 7)
                        .map((_, index) => {
                          const number = index + 1;
                          return (
                            <Link
                              key={number}
                              href={listing(params, { page: String(number) })}
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-all ${
                                number === page
                                  ? "bg-pine text-cream shadow-sm"
                                  : "text-ink-soft hover:bg-cream hover:text-ink"
                              }`}
                            >
                              {number}
                            </Link>
                          );
                        })}
                    </div>
                    {page < totalPages ? (
                      <ButtonLink
                        href={listing(params, { page: String(page + 1) })}
                        variant="outline"
                        size="sm"
                      >
                        Next <Icon name="arrow-right" size={14} />
                      </ButtonLink>
                    ) : (
                      <span />
                    )}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                className="mt-8"
                icon="search"
                title="No homes match those filters"
                description="Try widening your dates, raising the budget or removing an amenity. Our collection is small on purpose."
                action={
                  <ButtonLink href="/search" variant="outline">
                    Clear filters
                  </ButtonLink>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterForm({
  params,
  city,
  type,
  guests,
  minPrice,
  maxPrice,
  checkIn,
  checkOut,
  amenities,
  selectedAmenities,
  destinations,
  onMobile = false,
}: {
  params: SearchParams;
  city: string;
  type: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  checkIn: string;
  checkOut: string;
  amenities: Array<{ id: string; name: string; icon: string }>;
  selectedAmenities: string[];
  destinations: string[];
  onMobile?: boolean;
}) {
  return (
    <form method="get" action="/search" className="space-y-5">
      {single(params.sort) && (
        <input type="hidden" name="sort" value={single(params.sort)} />
      )}

      <Field label="Destination" htmlFor={onMobile ? "m-city" : "city"}>
        <Select id={onMobile ? "m-city" : "city"} name="city" defaultValue={city}>
          <option value="">Anywhere</option>
          {destinations.map((destination) => (
            <option key={destination} value={destination}>
              {destination}
            </option>
          ))}
        </Select>
      </Field>

      <div className="h-px bg-line" />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Check in" htmlFor={onMobile ? "m-checkin" : "checkin"}>
          <Input
            id={onMobile ? "m-checkin" : "checkin"}
            type="date"
            name="checkIn"
            defaultValue={checkIn}
          />
        </Field>
        <Field label="Check out" htmlFor={onMobile ? "m-checkout" : "checkout"}>
          <Input
            id={onMobile ? "m-checkout" : "checkout"}
            type="date"
            name="checkOut"
            defaultValue={checkOut}
          />
        </Field>
      </div>

      <div className="h-px bg-line" />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Guests" htmlFor={onMobile ? "m-guests" : "guests"}>
          <Select
            id={onMobile ? "m-guests" : "guests"}
            name="guests"
            defaultValue={guests ?? ""}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
              <option key={count} value={count}>
                {count}+
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Home type" htmlFor={onMobile ? "m-type" : "type"}>
          <Select id={onMobile ? "m-type" : "type"} name="type" defaultValue={type}>
            <option value="">All types</option>
            {PROPERTY_TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabel(item)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="h-px bg-line" />

      <div>
        <p className="label mb-3">Budget per night</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            name="minPrice"
            min={0}
            step={500}
            placeholder="Min"
            defaultValue={minPrice ?? ""}
            aria-label="Minimum price"
          />
          <Input
            type="number"
            name="maxPrice"
            min={0}
            step={500}
            placeholder="Max"
            defaultValue={maxPrice ?? ""}
            aria-label="Maximum price"
          />
        </div>
        <p className="mt-1.5 text-[10.5px] text-muted">
          Nightly rates from {formatINR(500000, { compact: true })}
        </p>
      </div>

      <div className="h-px bg-line" />

      <div>
        <p className="label mb-3">Amenities</p>
        <div className="grid grid-cols-2 gap-1.5">
          {amenities.slice(0, 10).map((amenity) => (
            <label
              key={amenity.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] font-medium text-ink-soft transition-all has-[:checked]:border-pine has-[:checked]:bg-pine-soft/50 has-[:checked]:text-pine-deep has-[:checked]:shadow-xs"
            >
              <input
                type="checkbox"
                name="amenity"
                value={amenity.id}
                defaultChecked={selectedAmenities.includes(amenity.id)}
                className="h-3.5 w-3.5 accent-pine"
              />
              <span className="truncate">{amenity.name}</span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" variant="secondary" className="w-full">
        <Icon name="search" size={15} /> Update results
      </Button>
      <Link
        href="/search"
        className="block text-center text-[12px] font-medium text-muted transition-colors hover:text-clay"
      >
        Reset filters
      </Link>
    </form>
  );
}
