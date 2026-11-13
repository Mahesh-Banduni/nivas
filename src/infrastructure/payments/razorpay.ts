import crypto from "node:crypto";
import { secret } from "../cloudflare/env";
import { newId } from "@/lib/ids";

/**
 * Razorpay integration.
 *
 * With no keys configured the app runs in demo mode: orders are generated
 * locally and the "checkout" produces a signature with the same HMAC scheme
 * Razorpay uses, so the verification code path is identical in both modes.
 */

export interface PaymentOrder {
  provider: "razorpay";
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  demo: boolean;
}

export function isDemoPayments(): boolean {
  return !secret("RAZORPAY_KEY_ID") || !secret("RAZORPAY_KEY_SECRET");
}

function signingSecret(): string {
  return secret("RAZORPAY_KEY_SECRET") || secret("SESSION_SECRET", "nivas-demo-secret");
}

function webhookSecret(): string {
  const configuredSecret = secret("RAZORPAY_WEBHOOK_SECRET");
  if (configuredSecret) return configuredSecret;
  return isDemoPayments() ? `${signingSecret()}:webhook` : "";
}

export async function createOrder(input: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<PaymentOrder> {
  const currency = input.currency ?? "INR";
  if (isDemoPayments()) {
    return {
      provider: "razorpay",
      orderId: `order_demo_${newId("o").slice(2)}`,
      amount: input.amount,
      currency,
      keyId: "rzp_demo_nivas",
      demo: true,
    };
  }

  const auth = Buffer.from(`${secret("RAZORPAY_KEY_ID")}:${secret("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: input.amount,
      currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Razorpay order failed: ${response.status} ${await response.text()}`);
  }
  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return {
    provider: "razorpay",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: secret("RAZORPAY_KEY_ID"),
    demo: false,
  };
}

/** Checkout callback verification: HMAC_SHA256(order_id|payment_id, key_secret) */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", signingSecret())
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, input.signature);
}

/** Used by the demo checkout to produce a valid callback signature. */
export function signDemoPayment(orderId: string, paymentId: string): string {
  return crypto
    .createHmac("sha256", signingSecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = webhookSecret();
  if (!signature || !key) return false;
  const expected = crypto.createHmac("sha256", key).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

export function signDemoWebhook(rawBody: string): string {
  return crypto.createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function createProviderRefund(input: {
  paymentId: string;
  amount: number;
  notes?: Record<string, string>;
}): Promise<{ refundId: string; demo: boolean }> {
  if (isDemoPayments()) {
    return { refundId: `rfnd_demo_${newId("r").slice(2)}`, demo: true };
  }
  const auth = Buffer.from(`${secret("RAZORPAY_KEY_ID")}:${secret("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: input.amount, notes: input.notes ?? {} }),
  });
  if (!response.ok) {
    throw new Error(`Razorpay refund failed: ${response.status} ${await response.text()}`);
  }
  const refund = (await response.json()) as { id: string };
  return { refundId: refund.id, demo: false };
}
