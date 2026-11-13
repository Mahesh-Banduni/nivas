/**
 * A tiny subset of the Cloudflare D1 API.
 *
 * Everything in the repository layer is written against this interface, so the
 * same code runs against:
 *   - `node:sqlite` in local development / CI  (LocalDatabase)
 *   - Cloudflare D1 in production              (D1Database adapter)
 *
 * All methods are async even locally, which keeps call-sites identical.
 */

export type SqlValue = string | number | null | Uint8Array;
export type Row = Record<string, unknown>;

export interface RunResult {
  success: true;
  changes: number;
  lastRowId: number;
}

export interface BoundStatement {
  all<T = Row>(): Promise<T[]>;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<RunResult>;
}

export interface PreparedStatement {
  bind(...values: unknown[]): BoundStatement;
  all<T = Row>(): Promise<T[]>;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<RunResult>;
}

export interface Database {
  prepare(sql: string): PreparedStatement;
  /** Executes statements atomically; rolls back everything if one fails. */
  batch(statements: BoundStatement[]): Promise<void>;
  exec(sql: string): Promise<void>;
}

export class UniqueConstraintError extends Error {
  constructor(message = "A unique constraint was violated") {
    super(message);
    this.name = "UniqueConstraintError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function normalizeValues(values: unknown[]): SqlValue[] {
  return values.map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return value;
    if (value instanceof Uint8Array) return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  });
}

/** node:sqlite returns null-prototype objects; Next needs plain objects. */
export function toPlain<T>(row: unknown): T | null {
  if (!row) return null;
  return { ...(row as Row) } as T;
}
