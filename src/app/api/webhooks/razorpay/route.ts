import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { handleRazorpayWebhook } from "@/modules/payments/payment.service";

export const runtime = "nodejs";

/**
 * Razorpay Webhook Handler
 *
 * Handles all Razorpay webhook events with:
 * - Signature verification (HMAC-SHA256)
 * - Idempotency via provider_event_id
 * - Proper error handling and logging
 * - Support for: payment.captured, payment.authorized, payment.failed,
 *   refund.processed, order.paid
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    const signature = request.headers.get("x-razorpay-signature");
    const eventId = request.headers.get("x-razorpay-event-id");

    console.log(`[webhook:${requestId}] Received Razorpay webhook`, {
      eventId: eventId?.slice(0, 16) + "...",
      bodyLength: rawBody.length,
    });

    // Process webhook
    const result = await handleRazorpayWebhook(rawBody, signature, eventId);

    const duration = Date.now() - startTime;
    console.log(`[webhook:${requestId}] Processed in ${duration}ms`, {
      handled: result.handled,
      duplicate: result.duplicate,
    });

    return Response.json(result, {
      status: 200,
      headers: {
        "X-Webhook-Request-Id": requestId,
        "X-Webhook-Duration": String(duration),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[webhook:${requestId}] Error after ${duration}ms:`, error);
    return toErrorResponse(error);
  }
}

/**
 * GET endpoint for webhook verification (Razorpay sends a test request)
 */
export async function GET() {
  return Response.json({
    status: "ok",
    message: "Nivas Razorpay webhook endpoint is active",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
  });
}