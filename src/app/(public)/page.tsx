import type { Metadata } from "next";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { PropertyArt } from "@/components/property/property-art";
import { PropertyCard } from "@/components/property/property-card";
import { SearchBar } from "@/components/site/search-bar";
import { ButtonLink, Button } from "@/components/ui/button";
import { Icon, Stars } from "@/components/ui/icon";
import { formatINR } from "@/lib/money";
import { getCurrentUser } from "@/modules/auth/session";
import {
  getDestinationsCached,
  getFeatured,
  getMarketplaceStats,
} from "@/modules/properties/property.service";
import { savedPropertyIds } from "@/modules/wishlist/wishlist.service";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Nivas — stays with a story",
};

const PROMISES = [
  {
    icon: "shield" as const,
    title: "Every home reviewed",
    body: "Our team checks each listing before it goes live, and hosts keep their calendars honest.",
  },
  {
    icon: "calendar" as const,
    title: "Live availability",
    body: "Nights are reserved atomically at checkout, so double bookings are structurally impossible.",
  },
  {
    icon: "credit-card" as const,
    title: "Protected payments",
    body: "Payments run through Razorpay with signed webhooks. Refunds follow a clear policy.",
  },
];

export default async function HomePage() {
  const [featured, destinations, stats, user] = await Promise.all([
    getFeatured(),
    getDestinationsCached(),
    getMarketplaceStats(),
    getCurrentUser(),
  ]);
  const saved = user ? await savedPropertyIds(user.id) : [];
  const cities = destinations.map((destination) => destination.city);
  const hero = featured[0];
  const secondary = featured[1];

  return (
    <div className="min-h-screen">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gold-soft-gradient">
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg width="100%" height="100%">
            <pattern id="hero-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0v44" fill="none" stroke="#191713" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="container-page relative grid gap-10 py-14 md:py-18 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24 xl:gap-14">
          <div className="animate-fade-up relative z-10">
            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium",
                "border-gold/30 bg-gold-soft/80 text-gold-deep",
              )}>
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
                {stats.properties}+ verified homes
              </span>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium",
                "border-pine/30 bg-pine-soft/80 text-pine-deep",
              )}>
                <Icon name="check" size={11} />
                {stats.cities}+ destinations
              </span>
            </div>

            <h1 className="display max-w-2xl text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.02] text-ink">
              The quiet side of India, one home at a time.
            </h1>

            <p className="mt-5 max-w-xl text-[clamp(1rem,2vw,1.125rem)] leading-relaxed text-ink-soft">
              Villas behind coconut palms, havelis with painted ceilings, cabins above the cloud
              line. Stay somewhere with a story — and a host who cares.
            </p>

            <div className="mt-8 animate-fade-up stagger-1">
              <SearchBar cities={cities} />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12.5px] text-muted animate-fade-up stagger-2">
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Icon name="check" size={14} className="text-pine" />
                Free cancellation on most stays
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Icon name="lock" size={14} className="text-gold-deep" />
                Secure Razorpay checkout
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Icon name="star" size={13} className="fill-gold text-gold" />
                {stats.stays}+ stays booked
              </span>
            </div>

            {/* Mobile hero image */}
            <div className="lg:hidden mt-10 animate-fade-up stagger-3">
              {hero && (
                <Link
                  href={`/properties/${hero.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line bg-sand shadow-xl"
                >
                  <div className="aspect-[4/3]">
                    <ArtImage
                      url={hero.cover_url}
                      r2Key={hero.cover_key}
                      type={hero.property_type}
                      alt={hero.title}
                      priority
                      className="h-full w-full transition duration-700 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 pt-14">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream/70">
                      {hero.city} · {hero.neighborhood ?? "featured stay"}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <h2 className="font-display text-[20px] text-cream">{hero.title}</h2>
                      <span className="rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-medium text-ink">
                        {formatINR(hero.nightly_price)} / night
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Desktop hero visual */}
          <div className="relative hidden lg:block animate-fade-up stagger-1">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full border border-gold/20 bg-gold-soft/50" />
              <div className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full border border-pine/20 bg-pine-soft/30" />

              {hero && (
                <Link
                  href={`/properties/${hero.slug}`}
                  className="group relative block overflow-hidden rounded-3xl border border-line bg-sand shadow-[0_40px_80px_-50px_rgba(25,23,19,0.3)]"
                >
                  <div className="aspect-[5/4]">
                    <ArtImage
                      url={hero.cover_url}
                      r2Key={hero.cover_key}
                      type={hero.property_type}
                      alt={hero.title}
                      priority
                      className="h-full w-full transition duration-[1200ms] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-6 pt-20">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cream/70">
                      {hero.city} · {hero.neighborhood ?? "featured stay"}
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <h2 className="font-display text-[28px] text-cream">{hero.title}</h2>
                      <span className="rounded-full bg-cream/90 px-3 py-1.5 text-[12px] font-medium text-ink">
                        {formatINR(hero.nightly_price)} / night
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {secondary && (
                <Link
                  href={`/properties/${secondary.slug}`}
                  className="group absolute -bottom-10 -left-12 hidden w-[240px] overflow-hidden rounded-2xl border border-cream/50 bg-cream shadow-[0_30px_60px_-35px_rgba(25,23,19,0.4)] xl:block"
                >
                  <div className="aspect-[4/3]">
                    <ArtImage
                      url={secondary.cover_url}
                      r2Key={secondary.cover_key}
                      type={secondary.property_type}
                      alt={secondary.title}
                      className="h-full w-full transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="truncate font-display text-[16px] text-ink">{secondary.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{secondary.city}</p>
                  </div>
                </Link>
              )}

              {/* Floating trust badge */}
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 hidden sm:block">
                <div className="rounded-2xl border border-gold/30 bg-white/95 backdrop-blur-sm px-5 py-4 shadow-xl animate-fade-up stagger-4">
                  <div className="flex items-center gap-2 text-gold-deep">
                    <Stars rating={4.9} size={14} className="text-gold" />
                    <span className="font-medium text-sm">Loved by guests</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">4.9/5 average rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Featured Stays */}
      <section className="container-page py-14 lg:py-20 xl:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <p className="eyebrow">Hand-picked</p>
            <h2 className="display mt-2 text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Stays worth the detour</h2>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted">
              A small, deliberate collection. Each home is chosen for its architecture, its
              setting and the way it makes you slow down.
            </p>
          </div>
          <ButtonLink href="/search" variant="outline" className="hidden sm:inline-flex">
            Browse all stays <Icon name="arrow-right" size={15} />
          </ButtonLink>
          <ButtonLink href="/search" variant="primary" size="sm" className="sm:hidden w-full">
            Browse all stays
          </ButtonLink>
        </div>

        <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              saved={saved.includes(property.id)}
              priority={index < 4}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Destinations */}
      <section className="py-14 lg:py-20 xl:py-24 bg-gold-soft-gradient border-y border-line">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <p className="eyebrow">Where to next</p>
              <h2 className="display mt-2 text-[clamp(1.75rem,4vw,2.5rem)] text-ink">Six ways to disappear</h2>
            </div>
            <ButtonLink href="/destinations" variant="ghost">
              All destinations <Icon name="arrow-up-right" size={14} />
            </ButtonLink>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {destinations.slice(0, 6).map((destination, index) => (
              <Link
                key={`${destination.city}-${destination.state}`}
                href={`/search?city=${encodeURIComponent(destination.city)}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-white"
              >
                <div className="aspect-[16/9]">
                  <ArtImage
                    r2Key={destination.cover_key}
                    url={destination.cover_url}
                    alt={`${destination.city} stays`}
                    className="h-full w-full transition duration-[900ms] group-hover:scale-[1.05]"
                    priority={index === 0}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent p-4 pt-14">
                  <div>
                    <h3 className="font-display text-[20px] text-cream">{destination.city}</h3>
                    <p className="text-[11.5px] text-cream/70">
                      {destination.properties} {destination.properties === 1 ? "home" : "homes"} · {destination.state}
                    </p>
                  </div>
                  <span className="rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-medium text-ink">
                    from {formatINR(destination.min_price, { compact: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Promises */}
      <section className="container-page py-14 lg:py-20 xl:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="animate-fade-up">
            <p className="eyebrow">Why Nivas</p>
            <h2 className="display mt-2 max-w-sm text-[clamp(1.75rem,4vw,2.5rem)] text-ink">
              Built like a hotel. Feels like a home.
            </h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
              The marketplace runs on Cloudflare&apos;s edge: D1 for transactional data, R2 for
              photos and KV for discovery caching. Guests get speed; hosts get reliability.
            </p>
            <ButtonLink href="/how-it-works" className="mt-6">
              How it works <Icon name="arrow-right" size={15} />
            </ButtonLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {PROMISES.map((promise, index) => (
              <div key={promise.title} className={cn("surface p-5 animate-fade-up", `stagger-${index + 1}`)}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft/80 text-gold-deep">
                  <Icon name={promise.icon} size={18} />
                </span>
                <h3 className="mt-4 font-display text-[18px] text-ink">{promise.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{promise.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Host CTA */}
      <section className="container-page pb-14 lg:pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-pine/20 bg-gradient-to-br from-pine via-pine-deep to-pine p-8 sm:p-12 lg:p-16">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-20 lg:block">
            <PropertyArt scene="haveli" tone={4} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-pine via-pine/70 to-transparent" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <p className="eyebrow text-gold-soft/80">For hosts</p>
            <h2 className="display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-tight text-cream">
              Your home, looked after like ours.
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-cream/70">
              A dashboard with occupancy, payout schedules and a calendar that cannot double-book.
              We handle payments, receipts and guest messaging in one thread.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <ButtonLink href={user ? "/become-a-host" : "/register?role=owner"} variant="clay" size="lg">
                Start hosting
              </ButtonLink>
              <ButtonLink href="/how-it-works#hosts" variant="outline" className="border-cream/30 text-cream hover:bg-cream/10" size="lg">
                Host guide
              </ButtonLink>
            </div>
            <div className="mt-7 flex flex-wrap gap-6 text-[11.5px] text-cream/55">
              <span className="inline-flex items-center gap-1.5"><Icon name="chart" size={14} /> Occupancy insights</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="wallet" size={14} /> Scheduled payouts</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} /> Instant booking sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Stats Bar */}
      <section className="border-y border-line bg-white py-10">
        <div className="container-page">
          <div className="grid gap-8 md:grid-cols-4 text-center">
            <div className="animate-fade-up stagger-1">
              <p className="display text-[clamp(2rem,4vw,3rem)] text-gold-deep">{stats.properties}+</p>
              <p className="mt-1 text-[13px] text-muted">Verified homes</p>
            </div>
            <div className="animate-fade-up stagger-2">
              <p className="display text-[clamp(2rem,4vw,3rem)] text-pine">{stats.cities}+</p>
              <p className="mt-1 text-[13px] text-muted">Destinations</p>
            </div>
            <div className="animate-fade-up stagger-3">
              <p className="display text-[clamp(2rem,4vw,3rem)] text-gold-deep">{stats.stays.toLocaleString()}+</p>
              <p className="mt-1 text-[13px] text-muted">Stays booked</p>
            </div>
            <div className="animate-fade-up stagger-4">
              <p className="display text-[clamp(2rem,4vw,3rem)] text-pine">99.9%</p>
              <p className="mt-1 text-[13px] text-muted">Uptime guarantee</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}