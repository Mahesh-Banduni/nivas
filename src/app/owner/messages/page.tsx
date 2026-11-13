import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Panel } from "@/components/ui/stat";
import { getDb } from "@/db";
import { timeAgo } from "@/lib/date";
import { requireRole } from "@/modules/auth/session";
import { listConversations } from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Messages" };

export default async function OwnerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const user = await requireRole("owner", "/owner/messages");
  const params = await searchParams;
  const db = await getDb();
  const conversations = await listConversations(db, user.id);
  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
  const focused = params.booking
    ? conversations.find((conversation) => conversation.booking_id === params.booking)
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Guest messages"
        description="Booking threads, arrival questions and enquiries across every home you host. Membership is verified on every request."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-[10.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pine animate-dot" />
            {totalUnread ? `${totalUnread} unread` : "All caught up"}
          </span>
        }
      />

      {focused && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/25 bg-pine-soft/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Icon name="message" size={16} className="text-pine" />
            <p className="text-[12.5px] text-ink">
              Conversation for this reservation with <span className="font-medium">{focused.other_name}</span>
            </p>
          </div>
          <ButtonLink href={`/owner/messages/${focused.id}`} size="sm">
            Open thread <Icon name="arrow-right" size={13} />
          </ButtonLink>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Conversations" action={<span className="text-[10.5px] text-muted">{conversations.length} threads</span>} bodyClassName="p-0">
          {conversations.length ? (
            <div>
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/owner/messages/${conversation.id}`}
                  className={`flex items-start gap-3 border-b border-line px-4 py-4 transition last:border-0 hover:bg-cream ${
                    conversation.id === focused?.id ? "bg-pine-soft/40" : ""
                  }`}
                >
                  <Avatar name={conversation.other_name ?? "Guest"} color={conversation.other_color ?? "#22483B"} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[13px] font-medium text-ink">{conversation.other_name ?? "Guest"}</p>
                      <span className="shrink-0 text-[10px] text-muted">
                        {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.06em] text-muted">
                      {conversation.property_title ?? conversation.subject ?? "Conversation"}
                    </p>
                    <p className={`mt-1 truncate text-[12px] ${conversation.unread ? "font-medium text-ink" : "text-muted"}`}>
                      {conversation.last_message_preview ?? "Start the conversation"}
                    </p>
                  </div>
                  {conversation.unread > 0 && <Badge tone="clay">{conversation.unread}</Badge>}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              className="m-5"
              icon="message"
              title="No conversations yet"
              description="Enquiries and confirmed bookings open a thread automatically. Replies land here."
              action={<ButtonLink href="/owner/properties" variant="outline">Review listings</ButtonLink>}
            />
          )}
        </Panel>

        <aside className="space-y-5">
          <Panel title="Reply guidelines">
            <ul className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
              {[
                "Aim to reply within a few hours — fast hosts rank higher in search.",
                "Keep arrival details, directions and access codes inside the thread.",
                "Never share payment links or ask guests to pay outside Nivas.",
                "Messages are capped at 2,000 characters and polling refreshes every 5 seconds.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="At a glance">
            <div className="space-y-3">
              {[
                ["Threads", String(conversations.length)],
                ["Unread", String(totalUnread)],
                ["Booking threads", String(conversations.filter((conversation) => conversation.booking_id).length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
                  <span className="text-[11.5px] text-muted">{label}</span>
                  <span className="font-display text-[17px] text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
