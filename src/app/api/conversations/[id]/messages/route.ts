import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { getThread, sendMessage } from "@/modules/messaging/messaging.service";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const db = await getDb();
    const thread = await getThread(db, user.id, id);
    return Response.json(thread);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const body = (await request.json()) as { body?: string };
    const db = await getDb();
    const message = await sendMessage(db, user.id, id, String(body.body ?? ""));
    return Response.json(message, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
