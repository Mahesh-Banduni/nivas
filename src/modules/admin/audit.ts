import type { BoundStatement, Database } from "@/db/database";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/date";

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: string | null;
}

/** Returns a statement so an audit entry can join the same batch as the change. */
export function auditStatement(db: Database, input: AuditInput): BoundStatement {
  return db
    .prepare(
      "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      newId("aud"),
      input.actorId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      input.metadata ?? null,
      nowIso(),
    );
}

export async function audit(db: Database, input: AuditInput) {
  await auditStatement(db, input).run();
}

export async function listAuditLogs(db: Database, limit = 50) {
  return db
    .prepare(
      `SELECT a.*, u.full_name AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      metadata: string | null;
      created_at: string;
      actor_name: string | null;
    }>();
}
