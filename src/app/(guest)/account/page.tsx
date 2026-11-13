import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getDb } from "@/db";
import { formatDate, timeAgo } from "@/lib/date";
import { roleLabel } from "@/lib/labels";
import { requireUser } from "@/modules/auth/session";
import { profileForUser } from "@/modules/auth/auth.service";
import { listNotifications } from "@/modules/notifications/notification.service";
import { secret } from "@/infrastructure/cloudflare/env";
import { markNotificationsReadAction } from "./actions";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const supportEmail = secret("SUPPORT_EMAIL").trim();
  const db = await getDb();
  const [{ owner }, notifications, stats, sessionRow] = await Promise.all([
    profileForUser(user),
    listNotifications(db, user.id, 12),
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM bookings WHERE guest_id = ?) AS trips,
           (SELECT COUNT(*) FROM wishlists w JOIN wishlist_items wi ON wi.wishlist_id = w.id WHERE w.user_id = ?) AS saved,
           (SELECT COUNT(*) FROM properties WHERE owner_id = ?) AS listings`,
      )
      .bind(user.id, user.id, user.id)
      .first<{ trips: number; saved: number; listings: number }>(),
    db
      .prepare("SELECT created_at, user_agent FROM sessions WHERE id = ?")
      .bind(user.sessionId)
      .first<{ created_at: string; user_agent: string | null }>(),
  ]);
  const unread = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="container-page py-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color={user.avatarColor} size={56} />
          <div>
            <p className="eyebrow">Your account</p>
            <h1 className="display mt-1.5 text-[34px] leading-tight text-ink">{user.name}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.roles.includes("owner") ? (
            <ButtonLink href="/owner" variant="outline">
              <Icon name="home" size={15} /> Host dashboard
            </ButtonLink>
          ) : (
            <ButtonLink href="/become-a-host" variant="outline">
              <Icon name="home" size={15} /> Become a host
            </ButtonLink>
          )}
          {user.roles.includes("admin") && (
            <ButtonLink href="/admin" variant="outline">
              <Icon name="shield" size={15} /> Admin console
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="surface p-5">
            <h2 className="font-display text-[20px] text-ink">Profile</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Full name", user.name],
                ["Email", user.email],
                ["Phone", user.phone ?? "Not added"],
                ["Member since", sessionRow ? formatDate(sessionRow.created_at.slice(0, 10), "long") : "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-[0.1em] text-muted">{label}</dt>
                  <dd className="mt-0.5 break-all text-[12.5px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted">Roles</span>
              {user.roles.map((role) => (
                <Badge key={role} tone={role === "admin" ? "clay" : role === "owner" ? "gold" : "pine"} dot={false}>
                  {roleLabel(role)}
                </Badge>
              ))}
            </div>
            {owner && (
              <div className="mt-4 rounded-lg border border-line bg-cream p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-ink">{owner.business_name}</p>
                  <Badge tone={owner.verification_status === "verified" ? "pine" : "gold"} dot>
                    {owner.verification_status}
                  </Badge>
                </div>
                {owner.bio && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{owner.bio}</p>}
                {owner.payout_last4 && (
                  <p className="mt-2 text-[10.5px] text-muted">Payout account ending {owner.payout_last4}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Trips", value: stats?.trips ?? 0, href: "/bookings", icon: "calendar" as const },
              { label: "Saved", value: stats?.saved ?? 0, href: "/wishlist", icon: "heart" as const },
              { label: "Listings", value: stats?.listings ?? 0, href: "/owner/properties", icon: "home" as const },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="surface p-4 transition hover:border-line-strong">
                <Icon name={stat.icon} size={16} className="text-pine" />
                <p className="display mt-2 text-[24px] leading-none text-ink">{stat.value}</p>
                <p className="mt-1 text-[11px] text-muted">{stat.label}</p>
              </Link>
            ))}
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[20px] text-ink">Notifications</h2>
                <p className="mt-0.5 text-[11px] text-muted">{unread ? `${unread} unread` : "All read"}</p>
              </div>
              {unread > 0 && (
                <form action={markNotificationsReadAction}>
                  <button type="submit" className="btn btn-ghost btn-sm">
                    <Icon name="check" size={14} /> Mark all read
                  </button>
                </form>
              )}
            </div>
            {notifications.length ? (
              <div className="mt-4 divide-y divide-line">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${notification.read_at ? "bg-line-strong" : "bg-clay"}`} />
                    <div className="min-w-0">
                      <p className={`text-[12.5px] ${notification.read_at ? "text-ink-soft" : "font-medium text-ink"}`}>
                        {notification.title}
                      </p>
                      {notification.body && <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{notification.body}</p>}
                      <p className="mt-1 text-[10px] text-muted">
                        {timeAgo(notification.created_at)} · {notification.channel.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-muted">Booking confirmations and host messages will appear here.</p>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="surface p-5">
            <p className="eyebrow mb-2">Security</p>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Sessions are httpOnly cookies hashed in the database. Signing out revokes this session
              immediately. Passwords are stored with scrypt.
            </p>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between rounded-lg border border-line bg-cream px-3 py-2">
                <span className="text-muted">Current session</span>
                <span className="inline-flex items-center gap-1 text-pine"><span className="h-1.5 w-1.5 rounded-full bg-pine" /> Active</span>
              </div>
              {sessionRow?.user_agent && (
                <p className="truncate text-[10px] text-muted">Device: {sessionRow.user_agent}</p>
              )}
            </div>
          </div>

          {supportEmail && <div className="rounded-xl border border-line bg-cream p-5">
            <p className="eyebrow mb-2">Need a hand?</p>
            <p className="text-[11.5px] leading-relaxed text-muted">
              The operations team can see your bookings, payments and message history.
            </p>
            <a href={`mailto:${supportEmail}`} className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-pine hover:underline">
              {supportEmail} <Icon name="arrow-up-right" size={12} />
            </a>
          </div>}
        </aside>
      </div>
    </div>
  );
}
