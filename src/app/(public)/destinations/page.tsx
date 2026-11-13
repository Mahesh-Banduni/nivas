import type { Metadata } from "next";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { getDestinationsCached } from "@/modules/properties/property.service";

export const metadata: Metadata = { title: "Destinations" };

export default async function DestinationsPage() {
  const destinations = await getDestinationsCached();

  return (
    <main>
      <section className="border-b border-line bg-cream py-12">
        <div className="container-page">
          <h1 className="display text-[clamp(2rem,5vw,3.5rem)] text-ink">Destinations</h1>
          <p className="mt-2 text-[13px] text-muted">
            {destinations.length} {destinations.length === 1 ? "destination" : "destinations"} with published stays
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        {destinations.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {destinations.map((destination, index) => (
              <Link
                key={`${destination.city}-${destination.state}`}
                href={`/search?city=${encodeURIComponent(destination.city)}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-sand"
              >
                <div className="aspect-[16/10]">
                  <ArtImage
                    mediaKey={destination.cover_key}
                    url={destination.cover_url}
                    alt={`${destination.city} stays`}
                    priority={index === 0}
                    className="h-full w-full transition duration-[1100ms] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream/65">{destination.state}</p>
                    <h2 className="mt-1 font-display text-[28px] text-cream">{destination.city}</h2>
                  </div>
                  <span className="rounded-full bg-cream/90 px-3 py-1.5 text-[11px] text-ink">
                    {destination.properties} {destination.properties === 1 ? "stay" : "stays"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="surface-quiet p-5 text-[13px] text-muted">
            No destinations with published stays yet.
          </p>
        )}
      </section>
    </main>
  );
}
