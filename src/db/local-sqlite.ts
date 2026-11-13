import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  DatabaseError,
  UniqueConstraintError,
  normalizeValues,
  toPlain,
  type BoundStatement,
  type Database,
  type PreparedStatement,
  type Row,
  type RunResult,
} from "./database";

/**
 * Local SQLite adapter that mimics D1's `prepare` / `bind` / `batch` surface.
 * `batch()` is wrapped in a single IMMEDIATE transaction so it has the same
 * all-or-nothing semantics D1 guarantees in production.
 */
class LocalStatement implements PreparedStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  private statement() {
    return this.db.prepare(this.sql);
  }

  bind(...values: unknown[]): BoundStatement {
    return new LocalStatement(this.db, this.sql, values);
  }

  async all<T = Row>(): Promise<T[]> {
    try {
      const rows = this.statement().all(...normalizeValues(this.values));
      return rows.map((row) => toPlain<T>(row) as T);
    } catch (error) {
      throw wrapError(error, this.sql);
    }
  }

  async first<T = Row>(): Promise<T | null> {
    try {
      return toPlain<T>(this.statement().get(...normalizeValues(this.values)));
    } catch (error) {
      throw wrapError(error, this.sql);
    }
  }

  async run(): Promise<RunResult> {
    try {
      const result = this.statement().run(...normalizeValues(this.values));
      return {
        success: true,
        changes: Number(result.changes ?? 0),
        lastRowId: Number(result.lastInsertRowid ?? 0),
      };
    } catch (error) {
      throw wrapError(error, this.sql);
    }
  }
}

function wrapError(error: unknown, sql: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed")) {
    return new UniqueConstraintError(message);
  }
  return new DatabaseError(message, error);
}

export class LocalDatabase implements Database {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
  }

  prepare(sql: string): PreparedStatement {
    return new LocalStatement(this.db, sql);
  }

  async batch(statements: BoundStatement[]): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of statements) {
        await statement.run();
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  raw() {
    return this.db;
  }
}
