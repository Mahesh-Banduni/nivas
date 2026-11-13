import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { simulatePayment } from "@/modules/payments/payment.service";

export const runtime = "nodejs";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const result = await simulatePayment(user.id, id);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}