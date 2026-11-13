"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string; backdrop_color?: string; hide_topbar?: boolean };
  modal?: { ondismiss: () => void; escape?: boolean; animation?: boolean };
  retry?: { enabled: boolean; max_count: number; interval: number };
  timeout?: number;
  remember_customer?: boolean;
  readonly?: { email?: boolean; contact?: boolean; name?: boolean };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  close(): void;
  on(
    event: "payment.failed",
    callback: (response: { error: { code: string; description: string; reason: string } }) => void,
  ): void;
}

function remaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

export function PaymentPanel({
  bookingId,
  total,
  expiresAt,
  guestName,
  guestEmail,
  guestPhone,
  propertyTitle,
}: {
  bookingId: string;
  total: number;
  expiresAt: string | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  propertyTitle?: string;
}) {
  const router = useRouter();
  const [milliseconds, setMilliseconds] = useState(() => remaining(expiresAt));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStage, setPaymentStage] = useState<"idle" | "creating_order" | "opening_checkout" | "verifying">("idle");
  const razorpayLoaded = useRef(false);
  const loadPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (milliseconds === null) return;
    const timer = setInterval(() => setMilliseconds(remaining(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, milliseconds]);

  const minutes = milliseconds === null ? null : Math.floor(milliseconds / 60_000);
  const seconds = milliseconds === null ? null : Math.floor((milliseconds % 60_000) / 1000);
  const expired = milliseconds !== null && milliseconds <= 0;
  const isLoading = pending || paymentStage !== "idle";

  const loadRazorpay = useCallback((): Promise<void> => {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.Razorpay) return Promise.resolve();
    if (loadPromise.current) return loadPromise.current;

    loadPromise.current = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        razorpayLoaded.current = true;
        resolve();
      };
      script.onerror = () => {
        loadPromise.current = null;
        reject(new Error("Could not load Razorpay checkout. Please check your connection."));
      };
      document.body.appendChild(script);
    });

    return loadPromise.current;
  }, []);

  const handlePayment = async () => {
    if (expired) return;
    setPending(true);
    setError(null);
    setPaymentStage("creating_order");

    try {
      // Create checkout session
      const sessionResponse = await fetch(`/api/bookings/${bookingId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const session = await sessionResponse.json();

      if (!sessionResponse.ok || !session.payment) {
        throw new Error(session.error ?? "Could not start checkout. Please try again.");
      }

      setPaymentStage("opening_checkout");
      await loadRazorpay();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout could not load. Please refresh and try again.");
      }

      const checkout = new window.Razorpay({
        key: session.keyId,
        order_id: session.orderId,
        amount: session.amount,
        currency: "INR",
        name: "Nivas",
        description: propertyTitle ?? "Stay reservation",
        image: "/logo-icon.svg",
        prefill: {
          name: guestName,
          email: guestEmail,
          contact: guestPhone,
        },
        notes: {
          booking_id: bookingId,
          property_title: propertyTitle ?? "",
        },
        theme: {
          color: "#1e4d3d",
          backdrop_color: "rgba(26, 23, 19, 0.7)",
          hide_topbar: false,
        },
        modal: {
          ondismiss: () => {
            setPending(false);
            setPaymentStage("idle");
          },
          escape: true,
          animation: true,
        },
        retry: { enabled: true, max_count: 3, interval: 1000 },
        timeout: 300,
        remember_customer: true,
        readonly: { email: true, contact: true, name: true },
        handler: async (response) => {
          setPaymentStage("verifying");
          try {
            const verify = await fetch(`/api/payments/${session.payment!.id}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            if (!verify.ok) {
              const failure = await verify.json();
              throw new Error(failure.error ?? "We could not verify the payment. Please contact support.");
            }

            router.push(`/bookings/${bookingId}?paid=1`);
            router.refresh();
          } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : "Payment verification failed");
            setPending(false);
            setPaymentStage("idle");
          }
        },
      });

      checkout.on("payment.failed", (response: { error: { code: string; description: string; reason: string } }) => {
        setError(`Payment failed: ${response.error.description} (${response.error.reason})`);
        setPending(false);
        setPaymentStage("idle");
      });

      checkout.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed. Please try again.");
      setPending(false);
      setPaymentStage("idle");
    }
  };

  const stageLabels: Record<string, string> = {
    idle: `Pay ${formatINR(total)} securely`,
    creating_order: "Creating secure order…",
    opening_checkout: "Opening payment gateway…",
    verifying: "Verifying payment…",
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Hold Timer */}
      {milliseconds !== null && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl p-4 border transition-all",
            expired
              ? "border-rose/30 bg-rose-soft/50 text-rose"
              : "border-gold/30 bg-gold-soft/50 text-gold-deep",
          )}
          role="timer"
          aria-live="polite"
          aria-label={expired ? "Hold expired" : `Time remaining: ${minutes}:${seconds?.toString().padStart(2, "0")}`}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", expired ? "bg-rose/20" : "bg-gold/20")}>
              <Icon name={expired ? "clock" : "clock"} size={16} className={cn(expired ? "text-rose" : "text-gold-deep")} />
            </div>
            <div>
              <p className="font-medium text-sm">{expired ? "Hold expired" : "Dates held for you"}</p>
              {!expired && (
                <p className="text-[11px] opacity-80">Complete payment to confirm your booking</p>
              )}
            </div>
          </div>
          {!expired && (
            <div className="flex items-center gap-1.5 font-mono font-medium tabular-nums text-lg">
              <span className="bg-white/50 px-2 py-0.5 rounded-lg">{String(minutes).padStart(2, "0")}</span>
              <span className="opacity-60">:</span>
              <span className="bg-white/50 px-2 py-0.5 rounded-lg">{String(seconds).padStart(2, "0")}</span>
            </div>
          )}
        </div>
      )}

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        disabled={isLoading || expired}
        size="lg"
        fullWidth
        isLoading={isLoading}
        leftIcon={!isLoading && <Icon name="lock" size={16} />}
        className={cn(
          "shadow-gold",
          expired && "opacity-50 cursor-not-allowed",
        )}
      >
        {stageLabels[paymentStage] || stageLabels.idle}
      </Button>

      {/* Error State */}
      {error && (
        <div
          className={cn(
            "rounded-xl border p-3 animate-slide-up",
            "border-rose/30 bg-rose-soft/50 text-rose",
          )}
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Security Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon name="shield" size={12} />
          </div>
          <span>Payments processed by Razorpay</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon name="badge-check" size={12} />
          </div>
          <span>Signed webhooks</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon name="repeat" size={12} />
          </div>
          <span>Idempotent settlement</span>
        </div>
      </div>

      {/* Accepted Payment Methods */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-muted">
        <span className="text-[11px]">Accepted:</span>
        <div className="flex items-center gap-1.5">
          <IconButton label="UPI" variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
            <span className="font-bold text-[10px]">UPI</span>
          </IconButton>
          <IconButton label="Credit Card" variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
            <Icon name="credit-card" size={14} />
          </IconButton>
          <IconButton label="Debit Card" variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
            <Icon name="credit-card" size={14} />
          </IconButton>
          <IconButton label="Net Banking" variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
            <Icon name="building-2" size={14} />
          </IconButton>
          <IconButton label="Wallet" variant="ghost" size="sm" className="opacity-60 hover:opacity-100">
            <Icon name="wallet" size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}