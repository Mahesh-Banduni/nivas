"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/cn";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  avatar_color: string;
  body: string;
  created_at: string;
}

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => undefined);
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { messages?: Message[] };
        if (active && data.messages) setMessages(data.messages);
      } catch {
        /* transient network errors are ignored; the next poll retries */
      }
    };
    const timer = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lastId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    const text = body.trim();
    setBody("");
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = (await response.json()) as { id?: string; created_at?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send your message");
      const thread = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      if (thread.ok) {
        const full = (await thread.json()) as { messages?: Message[] };
        if (full.messages) setMessages(full.messages);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message");
      setBody(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-260px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-line bg-cream/60">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-pine">
              <Icon name="message" size={20} />
            </span>
            <p className="mt-3 font-display text-[18px] text-ink">Start the conversation</p>
            <p className="mt-1 max-w-xs text-[12px] text-muted">
              Introduce yourself, ask about arrival times, or share a question about the home.
            </p>
          </div>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && <Avatar name={message.sender_name} color={message.avatar_color} size={28} />}
              <div className={cn("max-w-[78%] sm:max-w-[65%]", mine && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                    mine
                      ? "rounded-br-md bg-pine text-cream"
                      : "rounded-bl-md border border-line bg-cream text-ink-soft",
                  )}
                >
                  {message.body}
                </div>
                <p className={cn("mt-1 text-[9.5px] text-muted", mine && "text-right")}>
                  {mine ? "You" : message.sender_name.split(" ")[0]} · {timeAgo(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line bg-cream p-3">
        {error && <p className="mb-2 text-[11px] text-rose">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Message"
            className="field max-h-32 min-h-[42px] flex-1 resize-none py-2.5 text-[12.5px]"
          />
          <Button type="submit" disabled={pending || !body.trim()} className="h-[42px]">
            {pending ? "Sending" : "Send"} <Icon name="arrow-right" size={14} />
          </Button>
        </div>
        <p className="mt-1.5 text-[9.5px] text-muted">Enter to send · Shift + Enter for a new line</p>
      </form>
    </div>
  );
}
