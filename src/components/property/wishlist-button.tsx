"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export function WishlistButton({
  propertyId,
  initialSaved,
  className,
  variant = "floating",
}: {
  propertyId: string;
  initialSaved: boolean;
  className?: string;
  variant?: "floating" | "inline";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        if (response.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (!response.ok) throw new Error("Could not update your saved stays");
        const data = (await response.json()) as { saved: boolean };
        setSaved(data.saved);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong");
      }
    });
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={cn(
          "btn btn-outline btn-sm",
          saved && "border-clay/40 bg-clay-soft text-clay",
          className,
        )}
        title={error ?? undefined}
      >
        <Icon name="heart" size={15} className={saved ? "fill-current" : ""} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={saved ? "Remove from saved stays" : "Save this stay"}
      aria-pressed={saved}
      className={cn(
        "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-ink shadow-sm backdrop-blur transition hover:bg-cream",
        saved && "text-clay",
        pending && "opacity-60",
        className,
      )}
      title={error ?? undefined}
    >
      <Icon name="heart" size={15} className={saved ? "fill-current" : ""} />
    </button>
  );
}
