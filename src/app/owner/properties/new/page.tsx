import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/shell";
import { PropertyForm } from "@/components/owner/property-form";
import { requireRole } from "@/modules/auth/session";
import { getAmenityCatalogue } from "@/modules/properties/property.service";

export const metadata: Metadata = { title: "New listing" };

export default async function NewPropertyPage() {
  await requireRole("owner", "/owner/properties/new");
  const amenities = await getAmenityCatalogue();

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Add a home"
        description="Start with the essentials. A draft is saved immediately — photos and polishing can wait until the next screen."
        actions={<span className="rounded-full border border-line bg-cream px-3 py-1 text-[10.5px] uppercase tracking-[0.12em] text-muted">Step 1 of 2</span>}
      />

      <PropertyForm
        mode="create"
        amenities={amenities.map((amenity) => ({ id: amenity.id, name: amenity.name, icon: amenity.icon }))}
      />
    </div>
  );
}
