"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { markAllRead } from "@/modules/notifications/notification.service";
import { requireUser } from "@/modules/auth/session";

export async function markNotificationsReadAction() {
  const user = await requireUser("/account");
  const db = await getDb();
  await markAllRead(db, user.id);
  revalidatePath("/account");
}
