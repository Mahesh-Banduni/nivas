import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { badRequest, forbidden, notFound, toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { findPaymentById } from "@/modules/payments/payment.repository";
import { verifyPaymentSignature } from "@/infrastructure/payments/razorpay";
import { settlePayment } from "@/modules/payments/payment.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await getDb();
    const payment = await findPaymentById(db, id);
    if (!payment) throw notFound("Payment not found");
    const booking = await db
      .prepare("SELECT guest_id FROM bookings WHERE id = ?")
      .bind(payment.booking_id)
      .first<{ guest_id: string }>();
    if (!booking || booking.guest_id !== user.id) throw forbidden();

    const body = (await request.json()) as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    if (!payment.provider_order_id) throw badRequest("Payment order missing");
    if (body.razorpay_order_id !== payment.provider_order_id) throw badRequest("Order mismatch");
    if (!body.razorpay_payment_id || !body.razorpay_signature) throw badRequest("Missing payment reference");

    const valid = verifyPaymentSignature({
      orderId: payment.provider_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!valid) throw badRequest("Payment signature verification failed");

    const result = await settlePayment({
      paymentId: payment.id,
      providerPaymentId: body.razorpay_payment_id,
      method: "card",
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}