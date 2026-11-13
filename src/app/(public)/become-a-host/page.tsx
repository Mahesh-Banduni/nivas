import type { Metadata } from "next";
import Link from "next/link";
import { PropertyArt } from "@/components/property/property-art";
import { BecomeHostForm } from "@/components/auth/become-host-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/modules/auth/session";
import { profileForUser } from "@/modules/auth/auth.service";

export const metadata: Metadata = { title: "Become a host" };

const BENEFITS = [
  {
    icon: "chart" as const,
    title: "Know your occupancy",
    body: "A live 30-day view of booked nights, active holds and blocked dates — no spreadsheets.",
  },
  {
    icon: "calendar" as const,
    title: "A calendar that can't double-book",
    body: "Every night is a unique row in the database. Two guests cannot reserve the same date, even simultaneously.",
  },
  {
    icon: "wallet" as const,
    title: "Clear, scheduled payouts",
    body: "Commission and fees are recorded per booking. Earnings are itemised down to the rupee.",
  },
  {
    icon: "message" as const,
    title: "One thread per booking",
    body: "Talk to guests without exchanging phone numbers. Conversation membership is checked on every request.",
  },
];

export default async function BecomeAHostPage() {
  const user = await getCurrentUser();
  const profile = user ? await profileForUser(user) : null;
  const isOwner = user?.roles.includes("owner");

  return (
    <div>
      <section className="border-b border-line bg-[#f4efe5]">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="eyebrow">Hosting on Nivas</p>
            <h1 className="display mt-3 max-w-2xl text-[42px] leading-[1.02] text-ink sm:text-[54px]">
              Your home has a story. Let it earn its keep.
            </h1>
            <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-muted">
              Join a small collection of homes across India. We bring the booking engine, payments,
              guest messaging and a calendar that never double-books. You bring the place.
            </p>

            <div className="mt-8 max-w-lg rounded-2xl border border-line bg-cream p-5">
              {isOwner ? (
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="pine" dot>Host account</Badge>
                    <span className="text-[11px] text-muted">{profile?.owner?.verification_status ?? "pending"}</span>
                  </div>
                  <h2 className="mt-3 font-display text-[22px] text-ink">
                    You&apos;re already hosting, {user?.name.split(" ")[0]}.
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    Add another home or check today&apos;s arrivals from your workspace.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href="/owner">Open dashboard</ButtonLink>
                    <ButtonLink href="/owner/properties/new" variant="outline">Add a listing</ButtonLink>
                  </div>
                </div>
              ) : user ? (
                <div>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} color={user.avatarColor} size={36} />
                    <div>
                      <p className="text-[13px] font-medium text-ink">{user.name}</p>
                      <p className="text-[11px] text-muted">{user.email}</p>
                    </div>
                  </div>
                  <h2 className="mt-4 font-display text-[22px] text-ink">Set up hosting in one step</h2>
                  <p className="mb-4 mt-1 text-[12px] leading-relaxed text-muted">
                    Add the name you host under. Your guest account stays exactly as it is.
                  </p>
                  <BecomeHostForm defaultName={`${user.name.split(" ")[0]}'s homes`} />
                </div>
              ) : (
                <div>
                  <h2 className="font-display text-[22px] text-ink">Start with an account</h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    Create a host account, then add your first listing. It takes about ten minutes.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href="/register?role=owner">Create host account</ButtonLink>
                    <ButtonLink href="/login" variant="outline">Sign in</ButtonLink>
                  </div>
                  <p className="mt-3 text-[10.5px] text-muted">
                    Demo host: <span className="text-ink">arjun@nivas.test</span> · password123
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="overflow-hidden rounded-2xl border border-line bg-sand shadow-[0_40px_80px_-50px_rgba(25,23,19,0.55)]">
              <div className="aspect-[4/5]">
                <PropertyArt scene="haveli" tone={4} className="h-full w-full" />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-6 rounded-xl border border-line bg-cream p-4 shadow-lg">
              <p className="eyebrow">Example payout</p>
              <p className="mt-1 font-display text-[22px] text-ink">₹1,02,340</p>
              <p className="text-[10.5px] text-muted">18 nights · after 15% commission</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-pine">
                <Icon name={benefit.icon} size={17} />
              </span>
              <h3 className="mt-4 font-display text-[17px] text-ink">{benefit.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-cream py-14">
        <div className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">How the money works</p>
            <h2 className="display mt-2 text-[30px] text-ink">Transparent to the paisa.</h2>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted">
              Guests pay the nightly subtotal, cleaning fee, an 8% service fee and GST on that fee.
              Nivas keeps 15% of the nightly subtotal plus the service fee. The remainder is yours.
            </p>
            <Link href="/how-it-works#hosts" className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-pine hover:underline">
              Read the host guide <Icon name="arrow-right" size={13} />
            </Link>
          </div>
          <div className="surface overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <p className="text-[12px] font-medium text-ink">A three-night stay · ₹14,500 / night</p>
            </div>
            <div className="space-y-2.5 p-5 text-[12.5px]">
              {[
                ["Nightly subtotal", "₹43,500", false],
                ["Cleaning fee", "₹1,200", false],
                ["Guest service fee + GST", "₹4,119", false],
                ["Total charged to guest", "₹48,819", true],
                ["Platform commission (15%)", "− ₹6,525", false],
                ["Guest service fee + GST (retained by Nivas)", "− ₹4,119", false],
                ["Your payout", "₹38,175", true],
              ].map(([label, value, strong]) => (
                <div
                  key={String(label)}
                  className={`flex items-center justify-between ${strong ? "border-t border-line pt-2.5 font-medium text-ink" : "text-muted"}`}
                >
                  <span>{label}</span>
                  <span className={strong ? "text-ink" : "text-ink-soft"}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
