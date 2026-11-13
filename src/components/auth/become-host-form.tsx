"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

export function BecomeHostForm({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(defaultName);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/owner/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessName, bio }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not set up hosting");
      router.push("/owner");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not set up hosting");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Hosting as" htmlFor="businessName" hint="The name guests will see on your listings.">
        <Input
          id="businessName"
          required
          minLength={2}
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Business name"
        />
      </Field>
      <Field label="A short introduction" htmlFor="bio" hint="Optional — tells guests how you look after the home.">
        <Textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={600}
          placeholder="Describe your hosting business"
        />
      </Field>
      <FormError>{error}</FormError>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Setting up…" : "Open host dashboard"}
        {!pending && <Icon name="arrow-right" size={15} />}
      </Button>
      <p className="text-[10.5px] leading-relaxed text-muted">
        You keep your guest account. Hosting adds a workspace for listings, bookings and earnings.
        Listings are reviewed before they go live.
      </p>
    </form>
  );
}
