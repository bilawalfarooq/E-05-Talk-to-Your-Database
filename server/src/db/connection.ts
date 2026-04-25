import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH ?? resolve(__dirname, "../../data/bank.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const isFresh = !existsSync(DB_PATH);
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = resolve(__dirname, "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);

  if (isFresh) {
    console.log("[db] Fresh database — running seeder...");
  }

  return db;
}

export function getReadOnlyConnection(): Database.Database {
  const dbInstance = getDb();
  return dbInstance;
}

export const DB_FILE_PATH = DB_PATH;
