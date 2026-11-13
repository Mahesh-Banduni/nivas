import { cookies } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { logoutUser } from "@/modules/auth/auth.service";
import { SESSION_COOKIE, clearSessionCookie } from "@/modules/auth/session";

export async function POST() {
  try {
    const store = await cookies();
    await logoutUser(store.get(SESSION_COOKIE)?.value);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
