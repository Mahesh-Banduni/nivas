import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/stat";
import { ButtonLink } from "@/components/ui/button";
import { getDb } from "@/db";
import { timeAgo } from "@/lib/date";
import { requireUser } from "@/modules/auth/session";
import { listConversations } from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const db = await getDb();
  const conversations = await listConversations(db, user.id);
  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);

  return (
    <div className="container-page py-10 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="display mt-2 text-[36px] leading-tight text-ink sm:text-[42px]">Messages</h1>
          <p className="mt-2 text-[13px] text-muted">
            {conversations.length} {conversations.length === 1 ? "thread" : "threads"}
            {totalUnread ? ` · ${totalUnread} unread` : " · all caught up"}
          </p>
        </div>
      </div>

      {conversations.length ? (
        <div className="mt-8 overflow-hidden rounded-xl border border-line bg-cream/60">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="flex items-start gap-3 border-b border-line px-4 py-4 transition last:border-0 hover:bg-cream"
            >
              <Avatar name={conversation.other_name ?? "Nivas"} color={conversation.other_color ?? "#22483B"} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {conversation.other_name ?? "Nivas support"}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted">
                    {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ""}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10.5px] uppercase tracking-[0.06em] text-muted">
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
          className="mt-10"
          icon="message"
          title="No conversations yet"
          description="Ask a host about a home, or open a confirmed booking to arrange arrival details."
          action={<ButtonLink href="/search">Find a stay</ButtonLink>}
        />
      )}
    </div>
  );
}
