import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/shell";
import { PropertyForm, type PropertyFormValues } from "@/components/owner/property-form";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/labels";
import { requireRole } from "@/modules/auth/session";
import { getAmenityCatalogue, getPropertyPage } from "@/modules/properties/property.service";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireRole("owner", `/owner/properties/${id}/edit`);
  const [page, amenities] = await Promise.all([getPropertyPage(id), getAmenityCatalogue()]);
  const detail = page?.property;
  if (!detail || detail.owner_id !== user.id) notFound();

  const rules = detail.rules;
  const initial: PropertyFormValues = {
    title: detail.title,
    description: detail.description ?? "",
    propertyType: detail.property_type,
    city: detail.city,
    state: detail.state,
    neighborhood: detail.neighborhood ?? "",
    nightlyPrice: String(Math.round(detail.nightly_price / 100)),
    cleaningFee: String(Math.round(detail.cleaning_fee / 100)),
    maxGuests: String(detail.max_guests),
    bedrooms: String(detail.bedrooms),
    beds: String(detail.beds),
    bathrooms: String(detail.bathrooms),
    minNights: String(rules?.min_nights ?? 1),
    maxNights: String(rules?.max_nights ?? 30),
    cancellationPolicy: rules?.cancellation_policy ?? "moderate",
    checkInTime: rules?.check_in_time ?? "14:00",
    checkOutTime: rules?.check_out_time ?? "11:00",
    houseRules: rules?.house_rules ?? "",
    latitude: detail.latitude === null ? "" : String(detail.latitude),
    longitude: detail.longitude === null ? "" : String(detail.longitude),
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/owner/properties" className="hover:text-ink">Listings</Link>
            <span className="text-line-strong">/</span>
            <span>{detail.title}</span>
          </span>
        }
        title={detail.title}
        description={`${typeLabel(detail.property_type)} in ${detail.city}, ${detail.state} · ${formatINR(detail.nightly_price)} per night`}
        actions={
          <>
            <StatusBadge status={detail.status} />
            <Link href={`/owner/calendar?property=${detail.id}`} className="btn btn-outline btn-sm">
              <Icon name="calendar" size={13} /> Availability
            </Link>
          </>
        }
      />

      {detail.rejection_note && detail.status === "rejected" && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose/25 bg-rose-soft px-4 py-3 text-[12.5px] text-rose">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Changes requested by moderation</p>
            <p className="mt-0.5 leading-relaxed">{detail.rejection_note}</p>
          </div>
        </div>
      )}

      {detail.status === "suspended" && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose/25 bg-rose-soft px-4 py-3 text-[12.5px] text-rose">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          <p>This listing is suspended and hidden from search. Contact support if you believe this is a mistake.</p>
        </div>
      )}

      <PropertyForm
        mode="edit"
        propertyId={detail.id}
        initial={initial}
        amenities={amenities.map((amenity) => ({ id: amenity.id, name: amenity.name, icon: amenity.icon }))}
        selectedAmenities={detail.amenities.map((amenity) => amenity.id)}
        images={detail.images.map((image) => ({
          id: image.id,
          r2_key: image.r2_key,
          url: image.url,
          alt: image.alt,
          position: image.position,
        }))}
        status={detail.status}
        justCreated={created === "1"}
      />
    </div>
  );
}
