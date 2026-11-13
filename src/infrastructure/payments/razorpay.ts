import crypto from "node:crypto";
import { secret } from "../cloudflare/env";
import { unavailable } from "@/lib/errors";

/**
 * Razorpay integration. Payments are unavailable until both API credentials
 * are configured.
 */

export interface PaymentOrder {
  provider: "razorpay";
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(secret("RAZORPAY_KEY_ID") && secret("RAZORPAY_KEY_SECRET"));
}

function apiCredentials() {
  const keyId = secret("RAZORPAY_KEY_ID");
  const keySecret = secret("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    throw unavailable("Payments are not configured. Contact the site administrator.");
  }
  return { keyId, keySecret };
}

export async function createOrder(input: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<PaymentOrder> {
  const currency = input.currency ?? "INR";
  const { keyId, keySecret } = apiCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
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
    keyId,
  };
}

/** Checkout callback verification: HMAC_SHA256(order_id|payment_id, key_secret) */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = secret("RAZORPAY_KEY_SECRET");
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = secret("RAZORPAY_WEBHOOK_SECRET");
  if (!signature || !key) return false;
  const expected = crypto.createHmac("sha256", key).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
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
}): Promise<{ refundId: string }> {
  const { keyId, keySecret } = apiCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${input.paymentId}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: input.amount, notes: input.notes ?? {} }),
  });
  if (!response.ok) {
    throw new Error(`Razorpay refund failed: ${response.status} ${await response.text()}`);
  }
  const refund = (await response.json()) as { id: string };
  return { refundId: refund.id };
}
