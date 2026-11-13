import type { BoundStatement, Database } from "@/db/database";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/date";
import { publishToQueue, type QueueEvent } from "@/infrastructure/cloudflare/queues";
import { handleDomainEvent } from "./notification.service";

export interface OutboxInput {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  availableAt?: string;
}

/**
 * Transactional outbox.
 *
 * The statement is included in the same D1 batch as the business change, so a
 * committed booking always has its corresponding event. A scheduler drains
 * pending rows to Cloudflare Queues.
 */
export function outboxStatement(db: Database, input: OutboxInput): BoundStatement {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO outbox_events
        (id, type, aggregate_type, aggregate_id, payload, status, attempts, available_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    )
    .bind(
      newId("evt"),
      input.type,
      input.aggregateType,
      input.aggregateId,
      JSON.stringify(input.payload),
      input.availableAt ?? now,
      now,
    );
}

export interface DispatchResult {
  published: number;
  failed: number;
  consumed: number;
}

export async function dispatchOutbox(db: Database, limit = 50): Promise<DispatchResult> {
  const now = nowIso();
  const pending = await db
    .prepare(
      `SELECT * FROM outbox_events
       WHERE status = 'pending' AND available_at <= ?
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(now, limit)
    .all<{
      id: string;
      type: string;
      aggregate_type: string;
      aggregate_id: string;
      payload: string;
      attempts: number;
      created_at: string;
    }>();

  let published = 0;
  let failed = 0;
  let consumed = 0;

  for (const row of pending) {
    const event: QueueEvent = {
      id: row.id,
      type: row.type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: safeJson(row.payload),
      createdAt: row.created_at,
    };

    try {
      await publishToQueue(event);
      await db
        .prepare(
          "UPDATE outbox_events SET status = 'published', published_at = ?, attempts = attempts + 1 WHERE id = ? AND status = 'pending'",
        )
        .bind(nowIso(), row.id)
        .run();
      published += 1;

      // Locally there is no queue consumer, so consume inline. On Workers the
      // queue consumer invokes handleDomainEvent() instead.
      try {
        await handleDomainEvent(db, event);
        consumed += 1;
      } catch (error) {
        console.error("[outbox] consumer failed", row.id, error);
      }
    } catch (error) {
      failed += 1;
      const attempts = row.attempts + 1;
      const giveUp = attempts >= 5;
      const backoffMinutes = Math.min(60, attempts * attempts);
      await db
        .prepare(
          `UPDATE outbox_events
           SET status = ?, attempts = ?, last_error = ?, available_at = ?
           WHERE id = ?`,
        )
        .bind(
          giveUp ? "failed" : "pending",
          attempts,
          error instanceof Error ? error.message.slice(0, 500) : "unknown error",
          new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
          row.id,
        )
        .run();
    }
  }

  return { published, failed, consumed };
}

function safeJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : { value: parsed };
  } catch {
    return {};
  }
}

export async function outboxStats(db: Database) {
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM outbox_events`,
    )
    .first<{ pending: number | null; published: number | null; failed: number | null }>();
  return {
    pending: row?.pending ?? 0,
    published: row?.published ?? 0,
    failed: row?.failed ?? 0,
  };
}
