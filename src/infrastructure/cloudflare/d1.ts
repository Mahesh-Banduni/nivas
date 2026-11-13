import {
  DatabaseError,
  UniqueConstraintError,
  toPlain,
  type BoundStatement,
  type Database,
  type PreparedStatement,
  type Row,
  type RunResult,
} from "@/db/database";
import type { D1DatabaseLike, D1PreparedStatementLike } from "./env";

/** Cloudflare D1 adapter. Identical surface to LocalDatabase. */
class D1Statement implements PreparedStatement {
  constructor(
    private readonly db: D1DatabaseLike,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  private compiled(): D1PreparedStatementLike {
    const statement = this.db.prepare(this.sql);
    return this.values.length ? statement.bind(...this.values) : statement;
  }

  bind(...values: unknown[]): BoundStatement {
    return new D1Statement(this.db, this.sql, values);
  }

  async all<T = Row>(): Promise<T[]> {
    try {
      const result = await this.compiled().all<T>();
      return (result.results ?? []).map((row) => toPlain<T>(row) as T);
    } catch (error) {
      throw wrap(error);
    }
  }

  async first<T = Row>(): Promise<T | null> {
    try {
      return toPlain<T>(await this.compiled().first<T>());
    } catch (error) {
      throw wrap(error);
    }
  }

  async run(): Promise<RunResult> {
    try {
      const result = await this.compiled().run();
      return {
        success: true,
        changes: result.meta?.changes ?? 0,
        lastRowId: result.meta?.last_row_id ?? 0,
      };
    } catch (error) {
      throw wrap(error);
    }
  }
}

function wrap(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed")) return new UniqueConstraintError(message);
  return new DatabaseError(message, error);
}

export class D1Adapter implements Database {
  constructor(private readonly db: D1DatabaseLike) {}

  prepare(sql: string): PreparedStatement {
    return new D1Statement(this.db, sql);
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    // D1 batch() is atomic: statements run sequentially and roll back together.
    await this.db.batch(
      statements.map((statement) => (statement as unknown as { compiled(): D1PreparedStatementLike }).compiled()),
    );
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }
}
