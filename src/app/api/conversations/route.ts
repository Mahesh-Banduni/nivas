import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { toErrorResponse } from "@/lib/errors";
import { requireApiUser } from "@/modules/auth/session";
import { listConversations, startEnquiry } from "@/modules/messaging/messaging.service";

export async function GET() {
  try {
    const user = await requireApiUser();
    const db = await getDb();
    const conversations = await listConversations(db, user.id);
    return Response.json({ items: conversations });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json()) as { propertyId?: string; body?: string };
    const conversationId = await startEnquiry(user.id, String(body.propertyId ?? ""), String(body.body ?? ""));
    return Response.json({ conversationId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
