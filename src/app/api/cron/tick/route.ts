import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { toErrorResponse } from "@/lib/errors";
import { secret } from "@/infrastructure/cloudflare/env";
import { completePastStays, releaseExpiredHolds } from "@/modules/bookings/hold-sweeper";
import { dispatchOutbox } from "@/modules/notifications/outbox";

/**
 * Cron sweep. Wired to a Cloudflare Cron Trigger in production.
 * Protected by CRON_SECRET when one is configured.
 */
export async function POST(request: NextRequest) {
  try {
    const expected = secret("CRON_SECRET");
    if (expected) {
      const provided = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");
      if (provided !== expected) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const db = await getDb();
    const holds = await releaseExpiredHolds(db);
    const completed = await completePastStays(db);
    const outbox = await dispatchOutbox(db, 100);

    return Response.json({
      ok: true,
      releasedHolds: holds.released,
      reconciledPayments: holds.reconciled,
      completedStays: completed,
      outbox,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
