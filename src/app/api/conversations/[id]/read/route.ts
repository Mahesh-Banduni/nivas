import { getDb } from "@/db";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { markConversationRead } from "@/modules/messaging/messaging.service";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await getDb();
    await markConversationRead(db, user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
