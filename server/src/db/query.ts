import { getPostgresPool, getSqlite } from "./connection.js";
import { isPostgres } from "./dialect.js";

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
}

export async function runQuery(sql: string): Promise<QueryResult> {
  if (isPostgres()) {
    const pool = getPostgresPool();
    const start = Date.now();
    const r = await pool.query<Record<string, unknown>>(sql);
    const durationMs = Date.now() - start;
    if (r.rows.length === 0) {
      return { columns: [], rows: [], rowCount: 0, durationMs };
    }
    const columns = r.fields.map((f) => f.name);
    const rows = r.rows.map((row) => columns.map((c) => row[c]));
    return { columns, rows, rowCount: rows.length, durationMs };
  }
  const db = getSqlite();
  const start = Date.now();
  const stmt = db.prepare(sql);
  const rawRows = stmt.all() as Record<string, unknown>[];
  const durationMs = Date.now() - start;
  if (rawRows.length === 0) {
    return { columns: [], rows: [], rowCount: 0, durationMs };
  }
  const columns = Object.keys(rawRows[0]);
  const rows = rawRows.map((row) => columns.map((c) => row[c]));
  return { columns, rows, rowCount: rows.length, durationMs };
}

export async function runExplainQueryPlan(sql: string): Promise<string> {
  if (isPostgres()) {
    const pool = getPostgresPool();
    const r = await pool.query<Record<string, string>>(`EXPLAIN (FORMAT TEXT) ${sql}`);
    if (r.rows.length === 0) return "";
    const key = "QUERY PLAN" in r.rows[0] ? "QUERY PLAN" : Object.keys(r.rows[0])[0]!;
    return r.rows.map((row) => row[key] ?? String(row)).join("\n");
  }
  const db = getSqlite();
  const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Array<{ detail: string } | Record<string, unknown>>;
  if (rows.length > 0 && "detail" in rows[0]) {
    return rows.map((r) => (r as { detail: string }).detail).join("\n");
  }
  return JSON.stringify(rows);
}
