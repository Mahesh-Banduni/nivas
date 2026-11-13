import type { Metadata } from "next";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { getDestinationsCached } from "@/modules/properties/property.service";

export const metadata: Metadata = { title: "Destinations" };

const NOTES: Record<string, string> = {
  Goa: "Laterite lanes, oyster-shell windows and the long light of the Arabian Sea.",
  Rajasthan: "Painted havelis, courtyard shade and a city that wakes up slowly.",
  Karnataka: "Coffee country, river bends and plantation houses with deep verandahs.",
  Kerala: "Backwater quiet, pitched roofs and a kitchen full of coconut and curry leaf.",
  Maharashtra: "Sea-facing apartments and hill cabins within a morning's drive of the city.",
  "Himachal Pradesh": "Deodar air, slate roofs and windows that look straight into the mountains.",
  Delhi: "Lodhi-era stone, wide avenues and a guest suite in the middle of it all.",
  "Tamil Nadu": "Colonial verandahs, filter coffee and the Bay of Bengal at the end of the street.",
};

export default async function DestinationsPage() {
  const destinations = await getDestinationsCached();
  const totalHomes = destinations.reduce((sum, destination) => sum + destination.properties, 0);

  return (
    <div>
      <section className="border-b border-line bg-[#f4efe5]">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">Destinations</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <h1 className="display max-w-2xl text-[42px] leading-[1.02] text-ink sm:text-[54px]">
              A map of the places we know by heart.
            </h1>
            <p className="max-w-md text-[13.5px] leading-relaxed text-muted">
              {totalHomes} homes across {destinations.length} destinations. We add a city only when
              we have hosts we trust there — no filler, no lookalike listings.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {destinations.map((destination, index) => (
            <Link
              key={`${destination.city}-${destination.state}`}
              href={`/search?city=${encodeURIComponent(destination.city)}`}
              className={`group relative overflow-hidden rounded-2xl border border-line bg-sand ${
                index % 5 === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className={index % 5 === 0 ? "aspect-[21/9]" : "aspect-[16/10]"}>
                <ArtImage
                  r2Key={destination.cover_key}
                  url={destination.cover_url}
                  alt={`${destination.city} stays`}
                  priority={index === 0}
                  className="h-full w-full transition duration-[1100ms] group-hover:scale-[1.04]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
                <div className="max-w-md">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-cream/65">{destination.state}</p>
                  <h2 className="mt-1 font-display text-[28px] leading-tight text-cream sm:text-[34px]">
                    {destination.city}
                  </h2>
                  <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-cream/70">
                    {NOTES[destination.city] ?? "Hand-picked homes with hosts who know the neighbourhood."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cream/90 px-3 py-1.5 text-[11px] text-ink">
                    {destination.properties} {destination.properties === 1 ? "home" : "homes"}
                  </span>
                  <span className="rounded-full bg-cream/90 px-3 py-1.5 text-[11px] text-ink">
                    from {formatINR(destination.min_price, { compact: true })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14 grid gap-6 rounded-2xl border border-line bg-cream p-7 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="eyebrow">Not on the list?</p>
            <h2 className="display mt-2 text-[26px] text-ink">Tell us where you want to stay.</h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
              We open new destinations when a host we trust joins. If you own a home somewhere
              interesting, we would love to see it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href="/become-a-host">
              List your home <Icon name="arrow-right" size={15} />
            </ButtonLink>
            <ButtonLink href="/search" variant="outline">
              Browse stays
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
