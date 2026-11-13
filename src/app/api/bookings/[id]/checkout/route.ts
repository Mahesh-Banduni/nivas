import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { ensureCheckoutSession } from "@/modules/payments/payment.service";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const session = await ensureCheckoutSession(user.id, id);
    return Response.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
