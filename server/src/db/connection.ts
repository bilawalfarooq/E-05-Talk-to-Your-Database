import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { isPostgres } from "./dialect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH ?? resolve(__dirname, "../../data/bank.sqlite");

let sqlite: Database.Database | null = null;
let pool: Pool | null = null;

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error("[db] SQLite not initialised. Call initConnection() first (or do not set DATABASE_URL).");
  }
  return sqlite;
}

export function getPostgresPool(): Pool {
  if (!pool) {
    throw new Error("[db] PostgreSQL pool not initialised. Set DATABASE_URL and call initConnection().");
  }
  return pool;
}

function connectSqlite(): void {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const isFresh = !existsSync(DB_PATH);
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const schemaPath = resolve(__dirname, "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");
  sqlite.exec(schemaSql);
  if (isFresh) {
    console.log("[db] Fresh SQLite file — seeder will run on boot.");
  }
}

function redactConnectionUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid DATABASE_URL — check server/.env)";
  }
}

async function connectPostgres(): Promise<void> {
  const { default: Pg } = await import("pg");
  const url = process.env.DATABASE_URL?.trim() ?? "";
  pool = new Pg.Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 15000 });
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    const err = e as Error & { code?: string; errors?: Error[] };
    const isRefused = err?.code === "ECONNREFUSED" || (err as AggregateError)?.errors?.some((x) => (x as NodeJS.ErrnoException).code === "ECONNREFUSED");
    if (isRefused) {
      console.error("\n[db] PostgreSQL connection refused. Nothing is listening at the host:port in DATABASE_URL, or a firewall is blocking the connection.\n");
      console.error("  Tried (password hidden):", redactConnectionUrl(url), "\n");
      console.error("  Fixes:\n");
      console.error("  • Neon: open https://console.neon.tech — ensure the project is active (un-paused) and the connection string is copied fresh.\n");
      console.error("  • If you are offline or Neon is not needed right now, remove DATABASE_URL from server/.env to use local SQLite (DB_PATH) instead.\n");
      console.error("  • Corporate VPNs often block 5432 — try another network or ask IT.\n");
    } else {
      console.error("[db] PostgreSQL test query failed:", err.message, err?.code ? `(${err.code})` : "");
    }
    throw e;
  }
  const schemaPath = resolve(__dirname, "schema.pg.sql");
  const full = readFileSync(schemaPath, "utf8");
  const parts = full
    .split(";")
    .map((s) => s.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n").trim())
    .filter((s) => s.length > 0);
  for (const p of parts) {
    const stmt = p.endsWith(";") ? p : p + ";";
    try {
      await pool.query(stmt);
    } catch (err) {
      console.warn(`[db] PG schema statement note:`, (err as Error).message);
    }
  }
  console.log("[db] PostgreSQL / Neon: schema ready.");
}

export const DB_FILE_PATH = DB_PATH;

let initDone = false;

export async function initConnection(): Promise<void> {
  if (initDone) return;
  if (isPostgres()) {
    await connectPostgres();
    const { seedPostgres } = await import("./seedPostgres.js");
    const r = await getPostgresPool().query("SELECT count(*)::int AS c FROM transactions");
    const c = Number((r.rows[0] as { c: string | number }).c);
    if (c === 0) {
      console.log("[db] Neon: empty data — running seeder…");
      await seedPostgres({ force: false });
    } else {
      console.log(`[db] Neon: already has ${c} transactions — skipping seeder.`);
    }
  } else {
    connectSqlite();
    const { seed } = await import("./seed.js");
    seed();
  }
  initDone = true;
}

/** Full rebuild (e.g. `npm run seed -- --force`). */
export async function reseedAll(): Promise<void> {
  if (isPostgres()) {
    const { truncatePostgres, seedPostgres } = await import("./seedPostgres.js");
    const c = await getPostgresPool().connect();
    try {
      await truncatePostgres(c);
    } finally {
      c.release();
    }
    await seedPostgres({ force: true });
  } else {
    const { seed } = await import("./seed.js");
    seed({ force: true });
  }
}

/** Export raw generator for any scripts / tests. */
export { generateBankSeedData } from "./seedData.js";
