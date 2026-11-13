import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "How it works" };

const GUEST_STEPS = [
  {
    icon: "search" as const,
    title: "Find a home",
    body: "Search by destination, dates and the number of guests. Every card shows live availability, not last week's calendar.",
  },
  {
    icon: "calendar" as const,
    title: "Reserve the nights",
    body: "Choosing dates creates a 15-minute hold. Each night is written to a unique row, so two guests cannot hold the same night.",
  },
  {
    icon: "credit-card" as const,
    title: "Pay securely",
    body: "Checkout runs through Razorpay. The webhook is signature-verified and idempotent — a retried event can never double-confirm a booking.",
  },
  {
    icon: "message" as const,
    title: "Talk to your host",
    body: "Every confirmed booking opens a private thread. Address, arrival time and the little things live in one place.",
  },
];

const HOST_STEPS = [
  {
    icon: "home" as const,
    title: "Create your listing",
    body: "Set the home's character, capacity, amenities, house rules and cancellation policy. Upload photos straight to R2.",
  },
  {
    icon: "shield" as const,
    title: "Get reviewed",
    body: "A moderator checks the listing before it appears in search. You will see the decision and any notes in your dashboard.",
  },
  {
    icon: "chart" as const,
    title: "Run the calendar",
    body: "Occupancy, bookings, holds, blocked dates and earnings update in real time. Cancel, block or message from one workspace.",
  },
  {
    icon: "wallet" as const,
    title: "Get paid",
    body: "The platform commission is recorded per booking. Payouts are scheduled on a rolling cycle and itemised in earnings.",
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      <section className="border-b border-line bg-[#f4efe5]">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">How Nivas works</p>
          <h1 className="display mt-3 max-w-3xl text-[42px] leading-[1.02] text-ink sm:text-[56px]">
            A marketplace that behaves like a well-run front desk.
          </h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-muted">
            Nivas is a multi-vendor property marketplace. Guests book nights, hosts manage homes,
            and an operations team keeps both sides honest. Underneath, a modular monolith runs on
            Cloudflare&apos;s edge.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <ButtonLink href="/search">
              Explore stays <Icon name="arrow-right" size={15} />
            </ButtonLink>
            <ButtonLink href="/become-a-host" variant="outline">
              Become a host
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">For guests</p>
            <h2 className="display mt-2 text-[30px] text-ink">From search to check-in</h2>
            <div className="mt-7 space-y-1">
              {GUEST_STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-xl px-1 py-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-pine">
                      <Icon name={step.icon} size={16} />
                    </span>
                    {index < GUEST_STEPS.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-2">
                    <h3 className="font-display text-[18px] text-ink">
                      {String(index + 1).padStart(2, "0")} · {step.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">For hosts</p>
            <h2 className="display mt-2 text-[30px] text-ink">From listing to payout</h2>
            <div className="mt-7 space-y-1">
              {HOST_STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-xl px-1 py-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream text-clay">
                      <Icon name={step.icon} size={16} />
                    </span>
                    {index < HOST_STEPS.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-2">
                    <h3 className="font-display text-[18px] text-ink">
                      {String(index + 1).padStart(2, "0")} · {step.title}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="border-y border-line bg-cream py-16">
        <div className="container-page">
          <p className="eyebrow">Trust & safety</p>
          <h2 className="display mt-2 max-w-2xl text-[30px] text-ink">
            The rules are boring on purpose.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Booking integrity", "One row per property-night, enforced by a database primary key. Holds expire automatically and are swept every minute."],
              ["Payment integrity", "Every webhook is verified with HMAC-SHA256, deduplicated by event id and matched against the stored amount before a booking is confirmed."],
              ["Conversation privacy", "Every message endpoint re-checks conversation membership. Membership is not inferred from the URL."],
            ].map(([title, body]) => (
              <div key={title} className="surface p-5">
                <Icon name="shield" size={18} className="text-pine" />
                <h3 className="mt-3 font-display text-[17px] text-ink">{title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="hosts" className="container-page py-16">
        <div className="rounded-2xl border border-line bg-[#f4efe5] p-8 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="eyebrow">Host economics</p>
              <h2 className="display mt-2 text-[30px] text-ink">Clear numbers, no surprises.</h2>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
                Guests pay the nightly subtotal plus a cleaning fee, an 8% service fee and 18% GST
                on that fee. Nivas keeps a 15% commission on the nightly subtotal plus the service
                fee. Everything else belongs to the host and is visible per booking.
              </p>
            </div>
            <div className="space-y-2">
              {[
                ["Platform commission", "15% of nightly subtotal"],
                ["Guest service fee", "8% + 18% GST on the fee"],
                ["Cancellation", "Policy set per listing"],
                ["Payouts", "Scheduled cycle, itemised"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-cream px-3.5 py-2.5 text-[12px]">
                  <span className="text-muted">{label}</span>
                  <span className="font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="border-t border-line bg-pine py-16 text-cream">
        <div className="container-page">
          <p className="eyebrow text-cream/50">Under the hood</p>
          <h2 className="display mt-2 max-w-2xl text-[30px] text-cream sm:text-[36px]">
            A modular monolith, deployed to the edge.
          </h2>
          <div className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Next.js App Router", "Server components render the marketplace; route handlers expose bookings, payments, chat and uploads."],
              ["Cloudflare D1", "Transactional SQL with batched writes. Booking nights are unique per property and date."],
              ["Cloudflare storage", "Private media uses R2, while KV caches public discovery reads. Booking events are stored in the transactional outbox."],
              ["Secure messaging", "Conversation membership is checked on every request; threads refresh automatically while you chat."],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-cream/20 pt-4">
                <h3 className="font-display text-[17px] text-cream">{title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-cream/60">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-[11px] text-cream/40">
            Local demo runs on node:sqlite behind the same database interface, with payments in
            signed demo mode. <Link href="/login" className="underline">Sign in</Link> to try the guest, host and admin portals.
          </p>
        </div>
      </section>
    </div>
  );
}
