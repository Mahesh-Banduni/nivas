import type { Metadata } from "next";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { PropertyCard } from "@/components/property/property-card";
import { SearchBar } from "@/components/site/search-bar";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/modules/auth/session";
import { getDestinationsCached, getFeatured } from "@/modules/properties/property.service";
import { savedPropertyIds } from "@/modules/wishlist/wishlist.service";

export const metadata: Metadata = { title: "Nivas" };

export default async function HomePage() {
  const [featured, destinations, user] = await Promise.all([
    getFeatured(),
    getDestinationsCached(),
    getCurrentUser(),
  ]);
  const saved = user ? await savedPropertyIds(user.id) : [];

  return (
    <main>
      <section className="border-b border-line bg-gold-soft-gradient py-12 sm:py-16">
        <div className="container-page">
          <h1 className="display text-[clamp(2rem,5vw,3.5rem)] text-ink">Search stays</h1>
          <div className="mt-6 max-w-4xl">
            <SearchBar cities={destinations.map((destination) => destination.city)} />
          </div>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Published stays</h2>
          <ButtonLink href="/search" variant="outline">
            Search all stays <Icon name="arrow-right" size={15} />
          </ButtonLink>
        </div>
        {featured.length ? (
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                saved={saved.includes(property.id)}
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <p className="surface-quiet mt-6 p-5 text-[13px] text-muted">
            No published stays yet.
          </p>
        )}
      </section>

      {destinations.length > 0 && (
        <section className="border-y border-line bg-cream py-12 lg:py-16">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Destinations</h2>
              <Link href="/destinations" className="text-[12px] text-pine hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {destinations.slice(0, 6).map((destination, index) => (
                <Link
                  key={`${destination.city}-${destination.state}`}
                  href={`/search?city=${encodeURIComponent(destination.city)}`}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-white"
                >
                  <div className="aspect-[16/9]">
                    <ArtImage
                      mediaKey={destination.cover_key}
                      url={destination.cover_url}
                      alt={`${destination.city} stays`}
                      className="h-full w-full transition duration-[900ms] group-hover:scale-[1.05]"
                      priority={index === 0}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12">
                    <h3 className="font-display text-[20px] text-cream">{destination.city}</h3>
                    <p className="text-[11.5px] text-cream/70">{destination.state}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
