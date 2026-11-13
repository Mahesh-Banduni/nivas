import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, Stars } from "@/components/ui/icon";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat";
import { getDb } from "@/db";
import { formatDate, timeAgo } from "@/lib/date";
import { requireRole } from "@/modules/auth/session";
import { listAllReviews } from "@/modules/admin/admin.service";
import { setReviewVisibilityAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await requireRole("admin", "/admin/reviews");
  const db = await getDb();
  const reviews = await listAllReviews(db, 100);

  const published = reviews.filter((review) => review.status === "published");
  const hidden = reviews.filter((review) => review.status === "hidden");
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Quality"
        title="Guest reviews"
        description="Moderate feedback across the marketplace. Hiding a review recalculates the listing's rating immediately."
        actions={
          <Link href="/search" target="_blank" className="btn btn-outline">
            <Icon name="external" size={14} /> Browse reviews
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total reviews" value={String(reviews.length)} icon="star" hint={`${published.length} published`} />
        <StatCard label="Average rating" value={average ? average.toFixed(2) : "—"} icon="rating" hint="Across every review" />
        <StatCard label="Hidden" value={String(hidden.length)} icon="eye" hint="Excluded from ratings" />
        <StatCard
          label="Five-star share"
          value={`${reviews.length ? Math.round((reviews.filter((review) => review.rating === 5).length / reviews.length) * 100) : 0}%`}
          icon="trend-up"
          hint="Quality signal"
        />
      </div>

      <Panel className="mt-5" title="All feedback" action={<span className="text-[10.5px] text-muted">newest first</span>} bodyClassName="p-0">
        {reviews.length ? (
          <div className="divide-y divide-line">
            {reviews.map((review) => (
              <article key={review.id} className={`px-5 py-4 ${review.status === "hidden" ? "bg-cream/50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={review.rating} size={12} className="text-clay" />
                      <span className="text-[11.5px] font-medium text-ink">{review.rating.toFixed(1)}</span>
                      <Badge tone={review.status === "published" ? "pine" : "neutral"} dot>{review.status}</Badge>
                    </div>
                    <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">
                      {review.comment ?? <span className="italic text-muted">No written comment</span>}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted">
                      {review.guest_name} · {review.property_title} · {formatDate(review.created_at.slice(0, 10))} · {timeAgo(review.created_at)}
                    </p>
                  </div>
                  <form action={setReviewVisibilityAction} className="flex items-center gap-2">
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="status" value={review.status === "published" ? "hidden" : "published"} />
                    <Button type="submit" size="sm" variant="outline">
                      <Icon name={review.status === "published" ? "eye" : "check"} size={12} />
                      {review.status === "published" ? "Hide" : "Publish"}
                    </Button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState className="m-5" icon="star" title="No reviews yet" description="Completed stays can leave a review within 14 days of check-out." />
        )}
      </Panel>
    </div>
  );
}
