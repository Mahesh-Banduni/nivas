"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArtImage } from "@/components/property/art-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PROPERTY_TYPES } from "@/modules/properties/property.schema";
import { typeLabel } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import {
  savePropertyAction,
  submitListingAction,
  type PropertyFormState,
} from "@/app/owner/actions";

interface Amenity {
  id: string;
  name: string;
  icon: string;
}

interface ImageRow {
  id: string;
  r2_key: string;
  url: string | null;
  alt: string | null;
  position: number;
}

export interface PropertyFormValues {
  title: string;
  description: string;
  propertyType: string;
  city: string;
  state: string;
  neighborhood: string;
  nightlyPrice: string;
  cleaningFee: string;
  maxGuests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  minNights: string;
  maxNights: string;
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string;
  latitude: string;
  longitude: string;
}

const EMPTY: PropertyFormValues = {
  title: "",
  description: "",
  propertyType: "villa",
  city: "",
  state: "",
  neighborhood: "",
  nightlyPrice: "",
  cleaningFee: "0",
  maxGuests: "2",
  bedrooms: "1",
  beds: "1",
  bathrooms: "1",
  minNights: "1",
  maxNights: "30",
  cancellationPolicy: "moderate",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  houseRules: "",
  latitude: "",
  longitude: "",
};

export function PropertyForm({
  mode,
  propertyId,
  initial = EMPTY,
  amenities,
  selectedAmenities = [],
  images = [],
  status,
  justCreated = false,
}: {
  mode: "create" | "edit";
  propertyId?: string;
  initial?: PropertyFormValues;
  amenities: Amenity[];
  selectedAmenities?: string[];
  images?: ImageRow[];
  status?: string;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<PropertyFormState, FormData>(
    savePropertyAction,
    {},
  );
  const [nightly, setNightly] = useState(initial.nightlyPrice);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const errors = state.details ?? {};
  const canSubmitForReview = status === "draft" || status === "rejected";

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || !propertyId) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
          throw new Error(`${file.name} is not a supported image`);
        }
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB`);
        const presign = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            propertyId,
            filename: file.name,
            contentType: file.type,
            contentLength: file.size,
          }),
        });
        const target = (await presign.json()) as {
          uploadUrl?: string;
          method?: string;
          objectKey?: string;
          error?: string;
        };
        if (!presign.ok || !target.uploadUrl) throw new Error(target.error ?? "Could not authorise upload");

        const upload = await fetch(target.uploadUrl, {
          method: target.method ?? "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!upload.ok) {
          const failure = (await upload.json().catch(() => ({}))) as { error?: string };
          throw new Error(failure.error ?? `Upload failed for ${file.name}`);
        }
        const stored = await fetch(`/api/properties/${propertyId}/images`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: target.objectKey, url: null, alt: initial.title || null }),
        });
        if (!stored.ok) {
          const failure = (await stored.json()) as { error?: string };
          throw new Error(failure.error ?? "Could not attach the photo");
        }
      }
      router.refresh();
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(imageId: string) {
    if (!propertyId) return;
    setUploadError(null);
    const response = await fetch(`/api/properties/${propertyId}/images?imageId=${imageId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const failure = (await response.json()) as { error?: string };
      setUploadError(failure.error ?? "Could not remove the photo");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form action={formAction} className="space-y-5">
        {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}

        {justCreated && (
          <div className="flex items-start gap-2 rounded-xl border border-pine/20 bg-pine-soft px-4 py-3 text-[12.5px] text-pine">
            <Icon name="check" size={15} className="mt-0.5" />
            Draft created. Add photos, finish the details, then submit for review.
          </div>
        )}
        {state.saved && (
          <div className="flex items-start gap-2 rounded-xl border border-pine/20 bg-pine-soft px-4 py-3 text-[12.5px] text-pine">
            <Icon name="check" size={15} className="mt-0.5" /> Changes saved.
          </div>
        )}
        {state.error && <FormError>{state.error}</FormError>}

        <section className="surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[20px] text-ink">The home</h2>
            {status && <Badge tone={status === "published" ? "pine" : status === "pending" ? "gold" : "neutral"} dot>{status}</Badge>}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Listing title" htmlFor="title" error={errors.title} hint="Something specific and evocative — “Villa Siolim”, not “Beautiful villa”.">
              <Input id="title" name="title" required defaultValue={initial.title} placeholder="Villa Siolim" />
            </Field>

            <Field label="Description" htmlFor="description" error={errors.description} hint="At least a short paragraph. Mention the setting, the restoration, the light.">
              <Textarea
                id="description"
                name="description"
                required
                minLength={80}
                rows={8}
                defaultValue={initial.description}
                placeholder="A laterite-and-lime villa tucked behind a lane of coconut palms…"
                className="min-h-44"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Home type" htmlFor="propertyType" error={errors.propertyType}>
                <Select id="propertyType" name="propertyType" defaultValue={initial.propertyType}>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>{typeLabel(type)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="City" htmlFor="city" error={errors.city}>
                <Input id="city" name="city" required defaultValue={initial.city} placeholder="Goa" />
              </Field>
              <Field label="State" htmlFor="state" error={errors.state}>
                <Input id="state" name="state" required defaultValue={initial.state} placeholder="Goa" />
              </Field>
            </div>
            <Field label="Neighbourhood" htmlFor="neighborhood" error={errors.neighborhood}>
              <Input id="neighborhood" name="neighborhood" defaultValue={initial.neighborhood} placeholder="Siolim" />
            </Field>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-[20px] text-ink">Capacity & layout</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["maxGuests", "Max guests", initial.maxGuests],
              ["bedrooms", "Bedrooms", initial.bedrooms],
              ["beds", "Beds", initial.beds],
              ["bathrooms", "Bathrooms", initial.bathrooms],
            ].map(([name, label, value]) => (
              <Field key={name} label={label} htmlFor={name} error={errors[name]}>
                <Input id={name} name={name} type="number" min={1} required defaultValue={value} />
              </Field>
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-[20px] text-ink">Pricing</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Nightly rate (₹)"
              htmlFor="nightlyPrice"
              error={errors.nightlyPrice}
              hint={nightly && Number(nightly) >= 500 ? `${formatINR(Number(nightly) * 100)} per night before fees` : "Minimum ₹500"}
            >
              <Input
                id="nightlyPrice"
                name="nightlyPrice"
                type="number"
                min={500}
                step={100}
                required
                value={nightly}
                onChange={(event) => setNightly(event.target.value)}
                placeholder="14500"
              />
            </Field>
            <Field label="Cleaning fee (₹)" htmlFor="cleaningFee" error={errors.cleaningFee} hint="Charged once per stay.">
              <Input id="cleaningFee" name="cleaningFee" type="number" min={0} step={100} defaultValue={initial.cleaningFee} />
            </Field>
          </div>
          <p className="mt-3 rounded-lg bg-sand/50 px-3 py-2 text-[10.5px] leading-relaxed text-muted">
            Guests also pay an 8% service fee plus 18% GST on that fee. Nivas keeps a 15% commission
            on the nightly subtotal. Both are calculated by the server at checkout.
          </p>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-[20px] text-ink">Stay rules</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Minimum nights" htmlFor="minNights" error={errors.minNights}>
              <Input id="minNights" name="minNights" type="number" min={1} max={30} defaultValue={initial.minNights} />
            </Field>
            <Field label="Maximum nights" htmlFor="maxNights" error={errors.maxNights}>
              <Input id="maxNights" name="maxNights" type="number" min={1} max={180} defaultValue={initial.maxNights} />
            </Field>
            <Field label="Check-in time" htmlFor="checkInTime" error={errors.checkInTime}>
              <Input id="checkInTime" name="checkInTime" type="time" defaultValue={initial.checkInTime} />
            </Field>
            <Field label="Check-out time" htmlFor="checkOutTime" error={errors.checkOutTime}>
              <Input id="checkOutTime" name="checkOutTime" type="time" defaultValue={initial.checkOutTime} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Cancellation policy" htmlFor="cancellationPolicy" error={errors.cancellationPolicy}>
              <Select id="cancellationPolicy" name="cancellationPolicy" defaultValue={initial.cancellationPolicy}>
                <option value="flexible">Flexible — free until 24 hours before</option>
                <option value="moderate">Moderate — free until 5 days, then 50%</option>
                <option value="strict">Strict — 50% until 7 days, then non-refundable</option>
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="House rules" htmlFor="houseRules" error={errors.houseRules} hint="Quiet hours, parties, smoking, pets.">
              <Textarea id="houseRules" name="houseRules" rows={3} defaultValue={initial.houseRules} />
            </Field>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-[20px] text-ink">Amenities</h2>
          <p className="mt-1 text-[11px] text-muted">What makes the stay comfortable? Choose everything that applies.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {amenities.map((amenity) => (
              <Checkbox
                key={amenity.id}
                name="amenities[]"
                value={amenity.id}
                label={amenity.name}
                defaultChecked={selectedAmenities.includes(amenity.id)}
              />
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-[20px] text-ink">Location</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Latitude" htmlFor="latitude" error={errors.latitude} hint="Optional. Shown only as a rough area.">
              <Input id="latitude" name="latitude" type="number" step="0.0001" defaultValue={initial.latitude} placeholder="15.6122" />
            </Field>
            <Field label="Longitude" htmlFor="longitude" error={errors.longitude}>
              <Input id="longitude" name="longitude" type="number" step="0.0001" defaultValue={initial.longitude} placeholder="73.7689" />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create draft" : "Save changes"}
            {!pending && <Icon name="check" size={15} />}
          </Button>
          <Link href="/owner/properties" className="btn btn-ghost">Back to listings</Link>
          {mode === "edit" && propertyId && status === "published" && (
            <Link href={`/properties/${propertyId}`} className="btn btn-outline btn-sm" target="_blank">
              <Icon name="external" size={13} /> View live page
            </Link>
          )}
        </div>
      </form>

      <aside className="space-y-5">
        <div className="surface p-5">
          <h2 className="font-display text-[19px] text-ink">Photos</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            JPEG, PNG, WebP or AVIF, up to 8 MB each. Uploads go straight from the browser to Supabase Storage
            with a short-lived presigned URL — the API only issues the signature.
          </p>

          {propertyId ? (
            <>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-cream px-4 py-6 text-center transition hover:border-pine">
                <Icon name="upload" size={20} className="text-pine" />
                <span className="mt-2 text-[12px] font-medium text-ink">{uploading ? "Uploading…" : "Add photos"}</span>
                <span className="mt-0.5 text-[10px] text-muted">Select up to 6 at a time</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => uploadFiles(event.target.files)}
                />
              </label>
              {uploadError && <p className="mt-2 text-[10.5px] text-rose">{uploadError}</p>}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {images.map((image) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-lg border border-line bg-sand">
                    <div className="aspect-[4/3]">
                      <ArtImage mediaKey={image.r2_key} url={image.url} alt={image.alt ?? "Listing photo"} className="h-full w-full" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-cream/90 text-rose opacity-0 shadow transition group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                ))}
              </div>
              {images.length === 0 && (
                <p className="mt-3 text-[10.5px] text-muted">
                  No photos yet — the listing will use an illustrated placeholder until you add one.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 rounded-lg bg-sand/60 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted">
              Create the draft first. Photo uploads become available on the next screen.
            </p>
          )}
        </div>

        {mode === "edit" && propertyId && (
          <div className="surface p-5">
            <h2 className="font-display text-[19px] text-ink">Publishing</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {status === "published"
                ? "This listing is live. Edits take effect immediately; pricing changes do not affect confirmed bookings."
                : status === "pending"
                  ? "This listing is in the moderation queue. You'll get a notification when it is reviewed."
                  : "Submit the draft when the details and photos are ready. A moderator reviews every listing."}
            </p>
            {canSubmitForReview && (
              <form action={submitListingAction} className="mt-3">
                <input type="hidden" name="propertyId" value={propertyId} />
                <Button type="submit" variant="clay" className="w-full">
                  <Icon name="upload" size={14} /> Submit for review
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="rounded-xl border border-line bg-cream p-4">
          <p className="eyebrow mb-2">Good to know</p>
          <ul className="space-y-2 text-[10.5px] leading-relaxed text-muted">
            <li className="flex gap-2"><Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" /> Listings are reviewed before going live.</li>
            <li className="flex gap-2"><Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" /> Dates are only blocked when a booking is confirmed.</li>
            <li className="flex gap-2"><Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" /> Commission is 15% of the nightly subtotal.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
