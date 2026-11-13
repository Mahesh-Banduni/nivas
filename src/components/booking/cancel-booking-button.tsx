"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function CancelBookingButton({
  bookingId,
  label = "Cancel booking",
  variant = "outline",
  redirectTo,
}: {
  bookingId: string;
  label?: string;
  variant?: "outline" | "ghost" | "soft";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("This will release the dates and apply the listing's cancellation policy. Continue?")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled from the guest dashboard" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not cancel this booking");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel this booking");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button variant={variant} size="sm" onClick={cancel} disabled={pending}>
        <Icon name="close" size={13} /> {pending ? "Cancelling…" : label}
      </Button>
      {error && <p className="mt-1.5 max-w-xs text-[10.5px] text-rose">{error}</p>}
    </div>
  );
}
