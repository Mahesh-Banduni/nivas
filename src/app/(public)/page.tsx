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

export const metadata: Metadata = { title: "Nivas - Curated stays across India" };

export default async function HomePage() {
  const [featured, destinations, user] = await Promise.all([
    getFeatured(),
    getDestinationsCached(),
    getCurrentUser(),
  ]);
  const saved = user ? await savedPropertyIds(user.id) : [];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-br from-[#f9f4ea] via-[#fdfaf5] to-[#f0ece2] py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/[0.07] blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-pine/[0.05] blur-3xl" />
        </div>

        <div className="container-page relative">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Curated stays across India</p>
            <h1 className="display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-ink">
              Find your perfect<br />
              <span className="text-gradient-gold">home away</span> from home
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Handpicked villas, apartments, and heritage stays. Book directly with verified hosts.
            </p>
          </div>

          <div className="mt-8 max-w-4xl">
            <SearchBar cities={destinations.map((d) => d.city)} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {["Verified hosts", "No booking fees", "Secure payments via Razorpay"].map((signal) => (
              <div key={signal} className="flex items-center gap-2 text-[13px] text-ink-soft">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pine-soft text-pine">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured stays */}
      <section className="container-page py-14 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Handpicked for you</p>
            <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Featured stays</h2>
          </div>
          <ButtonLink href="/search" variant="outline" size="sm">
            Browse all <Icon name="arrow-right" size={14} />
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

      {/* Destinations */}
      {destinations.length > 0 && (
        <section className="border-y border-line bg-cream py-14 lg:py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Popular destinations</p>
                <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Explore by city</h2>
              </div>
              <Link
                href="/destinations"
                className="text-[13px] font-medium text-pine-deep transition-colors hover:text-gold-deep"
              >
                View all
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {destinations.slice(0, 6).map((destination, index) => (
                <Link
                  key={`${destination.city}-${destination.state}`}
                  href={`/search?city=${encodeURIComponent(destination.city)}`}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[4/5]">
                    <ArtImage
                      mediaKey={destination.cover_key}
                      url={destination.cover_url}
                      alt={`${destination.city} stays`}
                      className="h-full w-full object-cover transition duration-[900ms] group-hover:scale-[1.05]"
                      priority={index === 0}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-16">
                    <h3 className="font-display text-[18px] font-medium text-white">{destination.city}</h3>
                    <p className="mt-0.5 text-[12px] text-white/70">{destination.state}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="container-page py-14 lg:py-20">
        <div className="text-center">
          <p className="eyebrow mb-3">Simple process</p>
          <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Book in 3 easy steps</h2>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Search & discover",
              desc: "Browse our curated collection by location, dates, and what matters most to you.",
            },
            {
              step: "02",
              title: "Book with confidence",
              desc: "Secure your stay with verified hosts and transparent, all-inclusive pricing.",
            },
            {
              step: "03",
              title: "Arrive & enjoy",
              desc: "Check in seamlessly. Your perfect retreat is waiting with no surprises.",
            },
          ].map((item) => (
            <div key={item.step}>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 bg-gold-soft">
                <span className="text-[11px] font-bold tracking-widest text-gold-deep">{item.step}</span>
              </div>
              <h3 className="font-display text-[18px] font-medium text-ink">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Host CTA */}
      <section className="bg-pine py-16">
        <div className="container-page text-center">
          <p className="eyebrow text-pine-glow mb-3">Own a property?</p>
          <h2 className="display text-[clamp(1.75rem,4vw,2.5rem)] text-cream">List your space on Nivas</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-cream/70">
            Join our community of verified hosts and start earning from your property today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink
              href="/become-a-host"
              className="border-transparent bg-gold text-white shadow-gold hover:opacity-90"
            >
              Get started <Icon name="arrow-right" size={15} />
            </ButtonLink>
            <ButtonLink
              href="/search"
              variant="outline"
              className="border-cream/25 text-cream hover:border-cream/40 hover:bg-cream/10"
            >
              Explore stays
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
