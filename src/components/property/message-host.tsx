"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function MessageHost({
  propertyId,
  propertyTitle,
  signedIn,
  className,
}: {
  propertyId: string;
  propertyTitle: string;
  signedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(`Hi! We're interested in ${propertyTitle}. Could you tell us a little more about the neighbourhood and check-in?`);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId, body }),
      });
      const data = (await response.json()) as { conversationId?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send your message");
      router.push(`/messages/${data.conversationId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your message");
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
        <Icon name="message" size={14} /> Message host
      </Button>
      {open && (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-line bg-cream p-3 shadow-lg">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={2000}
            className="field resize-none text-[12px]"
            placeholder="Ask the host about the home…"
          />
          {error && <p className="mt-1.5 text-[11px] text-rose">{error}</p>}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted">{body.length}/2000</span>
            <Button size="sm" onClick={send} disabled={pending || body.trim().length === 0}>
              {pending ? "Sending…" : "Send enquiry"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
