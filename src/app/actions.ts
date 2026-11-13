"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutUser } from "@/modules/auth/auth.service";
import { SESSION_COOKIE, clearSessionCookie } from "@/modules/auth/session";

export async function logoutAction() {
  const store = await cookies();
  await logoutUser(store.get(SESSION_COOKIE)?.value);
  await clearSessionCookie();
  redirect("/");
}
