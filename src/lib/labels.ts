export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  villa: "Villa",
  apartment: "Apartment",
  heritage: "Heritage home",
  cabin: "Cabin",
  "beach house": "Beach house",
  farmhouse: "Farmhouse",
  suite: "Suite",
  studio: "Studio",
};

export function typeLabel(type: string | null | undefined): string {
  if (!type) return "Stay";
  return PROPERTY_TYPE_LABELS[type] ?? type.replace(/\b\w/g, (char) => char.toUpperCase());
}

export type Tone = "pine" | "clay" | "gold" | "rose" | "neutral" | "sky";

export function statusTone(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "published":
    case "booked":
    case "paid":
    case "completed":
    case "active":
    case "verified":
    case "sent":
      return { label: status === "sent" ? "Delivered" : titleCase(status), tone: "pine" };
    case "held":
    case "pending":
    case "processing":
    case "scheduled":
    case "partially_refunded":
      return { label: titleCase(status.replace("_", " ")), tone: "gold" };
    case "cancelled":
    case "suspended":
    case "failed":
    case "rejected":
      return { label: titleCase(status), tone: "rose" };
    case "expired":
    case "refunded":
    case "draft":
      return { label: titleCase(status), tone: "neutral" };
    case "unpaid":
      return { label: "Unpaid", tone: "neutral" };
    default:
      return { label: titleCase(status.replace(/_/g, " ")), tone: "neutral" };
  }
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function cancellationCopy(policy: string | null | undefined): string {
  switch (policy) {
    case "flexible":
      return "Free cancellation until 24 hours before check-in.";
    case "strict":
      return "50% refund until 7 days before check-in. Non-refundable after that.";
    default:
      return "Free cancellation until 5 days before check-in, then 50% refund until 2 days before.";
  }
}

export function roleLabel(role: string): string {
  return role === "admin" ? "Administrator" : role === "owner" ? "Host" : "Guest";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
