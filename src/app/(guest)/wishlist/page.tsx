import type { Metadata } from "next";
import { PropertyCard } from "@/components/property/property-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/stat";
import { requireUser } from "@/modules/auth/session";
import { getWishlist } from "@/modules/wishlist/wishlist.service";

export const metadata: Metadata = { title: "Saved stays" };

export default async function WishlistPage() {
  const user = await requireUser("/wishlist");
  const { items } = await getWishlist(user.id);

  return (
    <div className="container-page py-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your shortlist</p>
          <h1 className="display mt-2 text-[36px] leading-tight text-ink sm:text-[42px]">Saved stays</h1>
          <p className="mt-2 text-[13px] text-muted">
            {items.length ? `${items.length} ${items.length === 1 ? "home" : "homes"} saved for later.` : "Tap the heart on any listing to keep it here."}
          </p>
        </div>
        <ButtonLink href="/search" variant="outline">Keep exploring</ButtonLink>
      </div>

      {items.length ? (
        <div className="mt-9 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((property) => (
            <PropertyCard key={property.id} property={property} saved />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-10"
          icon="heart"
          title="Nothing saved yet"
          description="Save a few homes while you compare dates, then come back when you're ready to book."
          action={<ButtonLink href="/search">Browse the collection</ButtonLink>}
        />
      )}
    </div>
  );
}
