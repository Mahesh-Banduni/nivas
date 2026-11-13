import type { Metadata } from "next";
import { BecomeHostForm } from "@/components/auth/become-host-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/modules/auth/session";
import { profileForUser } from "@/modules/auth/auth.service";

export const metadata: Metadata = { title: "Become a host" };

export default async function BecomeAHostPage() {
  const user = await getCurrentUser();
  const profile = user ? await profileForUser(user) : null;
  const isOwner = user?.roles.includes("owner");

  return (
    <main className="container-page py-14 lg:py-20">
      <div className="mx-auto max-w-2xl">
        {/* ── Page hero ── */}
        <div className="mb-10">
          <p className="eyebrow mb-3">For property owners</p>
          <h1 className="display text-[clamp(2rem,5vw,3rem)] text-ink">
            {isOwner ? "Your host workspace" : "List your space on Nivas"}
          </h1>
          {!isOwner && (
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Join our curated community of hosts. We handle bookings, payments, and guest
              communication — you focus on the experience.
            </p>
          )}
        </div>

        {/* ── Benefits row (shown for non-owners) ── */}
        {!isOwner && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Direct bookings", desc: "No middlemen. Guests book directly with you." },
              { label: "Secure payments", desc: "Razorpay-powered, trusted by millions." },
              { label: "Full control", desc: "Set your own rates, rules, and calendar." },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-line bg-white p-4 shadow-xs">
                <div className="mb-2.5 h-1.5 w-8 rounded-full bg-gold" />
                <p className="text-[13.5px] font-semibold text-ink">{b.label}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Main card ── */}
        <div className="surface-elevated p-6 sm:p-8">
          {isOwner ? (
            <div>
              <div className="flex items-center gap-2.5">
                <Badge tone="pine" dot>Host account</Badge>
                <span className="text-[11px] text-muted">
                  {profile?.owner?.verification_status ?? "pending"}
                </span>
              </div>
              <h2 className="mt-4 font-display text-[22px] font-medium text-ink">
                Host workspace
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted">
                Manage your listings, track earnings, and communicate with guests.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <ButtonLink href="/owner">
                  <Icon name="grid" size={15} /> Open dashboard
                </ButtonLink>
                <ButtonLink href="/owner/properties/new" variant="outline">
                  <Icon name="plus" size={15} /> Add a listing
                </ButtonLink>
              </div>
            </div>
          ) : user ? (
            <div>
              <div className="flex items-center gap-3">
                <Avatar name={user.name} color={user.avatarColor} size={40} />
                <div>
                  <p className="text-[13.5px] font-medium text-ink">{user.name}</p>
                  <p className="text-[11.5px] text-muted">{user.email}</p>
                </div>
              </div>
              <h2 className="mt-5 font-display text-[22px] font-medium text-ink">
                Create your host account
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                Set up your hosting profile and start listing your property in minutes.
              </p>
              <div className="mt-5">
                <BecomeHostForm defaultName={`${user.name.split(" ")[0]}'s homes`} />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold-soft">
                <Icon name="home" size={22} className="text-gold-deep" />
              </div>
              <h2 className="font-display text-[22px] font-medium text-ink">
                Sign in or create an account
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted">
                You need an account to become a host on Nivas.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <ButtonLink href="/register?role=owner">
                  Create account <Icon name="arrow-right" size={15} />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
