import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ChatThread } from "@/components/messaging/chat-thread";
import { getDb } from "@/db";
import { requireRole } from "@/modules/auth/session";
import { getThread } from "@/modules/messaging/messaging.service";

export const metadata: Metadata = { title: "Conversation" };

export default async function OwnerThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("owner", `/owner/messages/${id}`);
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
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link href="/owner/messages" className="hover:text-ink">Inbox</Link>
            <span className="text-line-strong">/</span>
            <span>{other?.full_name ?? "Conversation"}</span>
          </span>
        }
        title={other?.full_name ?? "Conversation"}
        description={conversation.property_title ?? conversation.subject ?? "Direct message"}
        actions={
          <>
            {conversation.booking_id && <Badge tone="pine" dot={false}>Booking thread</Badge>}
            {conversation.booking_id && (
              <Link href={`/owner/bookings?focus=${conversation.booking_id}`} className="btn btn-outline btn-sm">
                <Icon name="calendar" size={13} /> Reservation
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={other?.full_name ?? "Guest"} color={other?.avatar_color ?? "#22483B"} size={38} />
            <div>
              <p className="text-[12.5px] font-medium text-ink">{other?.full_name ?? "Guest"}</p>
              <p className="flex items-center gap-1.5 text-[10.5px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-pine animate-dot" /> Polling live · membership checked per request
              </p>
            </div>
          </div>
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

        <aside className="space-y-5">
          <div className="surface p-4">
            <p className="eyebrow mb-2">Thread</p>
            <div className="space-y-3 text-[11.5px]">
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-muted">Home</p>
                <p className="mt-0.5 text-ink">{conversation.property_title ?? "General enquiry"}</p>
              </div>
              <div>
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-muted">Members</p>
                <div className="mt-1 space-y-1.5">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar name={member.full_name} color={member.avatar_color} size={22} />
                      <span className="text-ink">{member.full_name}</span>
                      {member.id === user.id && <Badge tone="neutral" dot={false}>you</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-cream p-4">
            <p className="eyebrow mb-2">Housekeeping</p>
            <ul className="space-y-2 text-[10.5px] leading-relaxed text-muted">
              <li className="flex gap-2"><Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" /> Reply within a few hours where possible.</li>
              <li className="flex gap-2"><Icon name="check" size={12} className="mt-0.5 shrink-0 text-pine" /> Keep access details inside the thread.</li>
              <li className="flex gap-2"><Icon name="lock" size={12} className="mt-0.5 shrink-0 text-pine" /> Never move payment off-platform.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
