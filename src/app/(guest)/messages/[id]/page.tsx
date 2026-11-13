import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ChatThread } from "@/components/messaging/chat-thread";
import { getDb } from "@/db";
import { requireUser } from "@/modules/auth/session";
import { getThread } from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const db = await getDb();
  let thread;
  try {
    thread = await getThread(db, user.id, id);
  } catch {
    notFound();
  }
  const { conversation, messages, members } = thread!;
  const other = members.find((member) => member.id !== user.id);

  return (
    <div className="container-page py-7 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/messages" className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
          <Icon name="arrow-left" size={13} /> Inbox
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={other?.full_name ?? "Nivas"} color={other?.avatar_color ?? "#22483B"} size={42} />
            <div>
              <h1 className="font-display text-[24px] leading-tight text-ink">{other?.full_name ?? "Conversation"}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                {conversation.property_title ?? conversation.subject ?? "Direct message"}
                {conversation.booking_id && <Badge tone="pine" dot={false}>Booking thread</Badge>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-pine animate-dot" /> Polling live
            </span>
          </div>
        </div>

        <div className="mt-4">
          <ChatThread
            conversationId={conversation.id}
            currentUserId={user.id}
            initialMessages={messages.map((message) => ({
              id: message.id,
              sender_id: message.sender_id,
              sender_name: message.sender_name,
              avatar_color: message.avatar_color,
              body: message.body,
              created_at: message.created_at,
            }))}
          />
        </div>

        <p className="mt-3 text-center text-[10px] text-muted">
          Membership is re-checked on every request. Messages are limited to 2000 characters.
        </p>
      </div>
    </div>
  );
}
