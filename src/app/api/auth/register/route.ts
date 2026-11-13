import { NextRequest } from "next/server";
import { parseInput } from "@/lib/validation";
import { toErrorResponse } from "@/lib/errors";
import { registerUser } from "@/modules/auth/auth.service";
import { registerSchema } from "@/modules/auth/auth.schema";
import { setSessionCookie } from "@/modules/auth/session";

export async function POST(request: NextRequest) {
  try {
    const input = parseInput(registerSchema, await request.json());
    const session = await registerUser(input, request.headers.get("user-agent"));
    await setSessionCookie(session.token, session.expiresAt);
    return Response.json({ ok: true, userId: session.userId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
