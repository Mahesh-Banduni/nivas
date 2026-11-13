"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const CATEGORIES = [
  ["cleanliness", "Cleanliness"],
  ["accuracy", "Accuracy"],
  ["communication", "Communication"],
  ["location", "Location"],
  ["value", "Value"],
] as const;

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [scores, setScores] = useState<Record<string, number>>({
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 5,
  });
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, ...scores, comment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not publish your review");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish your review");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="label">Overall rating</p>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} stars`}
              className={star <= rating ? "text-clay" : "text-line-strong"}
            >
              <Icon name="star" size={26} className={star <= rating ? "fill-current" : ""} />
            </button>
          ))}
          <span className="ml-2 text-[12px] text-muted">{rating}/5</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`score-${key}`}>
            <Input
              id={`score-${key}`}
              type="number"
              min={1}
              max={5}
              value={scores[key]}
              onChange={(event) =>
                setScores((current) => ({ ...current, [key]: Number(event.target.value) }))
              }
            />
          </Field>
        ))}
      </div>

      <Field label="Your review" htmlFor="comment" hint="What should the next guest know?">
        <Textarea
          id="comment"
          required
          minLength={10}
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="The courtyard is even better than the photos…"
        />
      </Field>

      <FormError>{error}</FormError>
      <Button type="submit" disabled={pending}>
        {pending ? "Publishing…" : "Publish review"}
        {!pending && <Icon name="arrow-right" size={15} />}
      </Button>
    </form>
  );
}
