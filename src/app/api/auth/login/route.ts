import { NextRequest } from "next/server";
import { parseInput } from "@/lib/validation";
import { toErrorResponse } from "@/lib/errors";
import { loginUser } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.schema";
import { setSessionCookie } from "@/modules/auth/session";

export async function POST(request: NextRequest) {
  try {
    const input = parseInput(loginSchema, await request.json());
    const session = await loginUser(input, request.headers.get("user-agent"));
    await setSessionCookie(session.token, session.expiresAt);
    return Response.json({ ok: true, userId: session.userId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
